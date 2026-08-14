"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateVendorInput = validateUpdateVendorInput;
exports.updateVendor = updateVendor;
exports.handleUpdateVendor = handleUpdateVendor;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateUpdateVendorInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.vendorId || typeof obj.vendorId !== 'string') {
        throw new validation_1.ValidationError('invalid_vendor_id', 'vendorId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateVendorFields)(obj);
    return { vendorId: obj.vendorId, ...fields };
}
/**
 * Updates a vendor after verifying the caller has event management
 * authority over the vendor's *stored* eventId — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event's
 * vendor. `id`, `eventId`, `createdBy`, and `createdAt` are carried over
 * from the existing document regardless of what the client sends.
 *
 * @throws ValidationError('vendor_not_found') if the vendor does not exist
 */
async function updateVendor(db, auth, input) {
    const vendorRef = db.collection('vendors').doc(input.vendorId);
    const snapshot = await vendorRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('vendor_not_found', 'Vendor not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
    const now = new Date().toISOString();
    await vendorRef.set((0, shared_1.buildVendorDocument)(input.vendorId, existing.eventId, existing.createdBy ?? auth.uid, input, existing.createdAt ?? now, now));
    return { vendorId: input.vendorId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateVendor(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateVendorInput(data);
    return updateVendor(db, { uid: context.auth.uid }, input);
}
