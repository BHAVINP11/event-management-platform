"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeleteVendorInput = validateDeleteVendorInput;
exports.deleteVendor = deleteVendor;
exports.handleDeleteVendor = handleDeleteVendor;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
function validateDeleteVendorInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.vendorId || typeof obj.vendorId !== 'string') {
        throw new validation_1.ValidationError('invalid_vendor_id', 'vendorId must be a non-empty string.');
    }
    return { vendorId: obj.vendorId };
}
/**
 * Deletes a vendor after verifying the caller has event management
 * authority over the vendor's *stored* eventId — never a client-supplied
 * value.
 *
 * @throws ValidationError('vendor_not_found') if the vendor does not exist
 */
async function deleteVendor(db, auth, input) {
    const vendorRef = db.collection('vendors').doc(input.vendorId);
    const snapshot = await vendorRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('vendor_not_found', 'Vendor not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
    await vendorRef.delete();
    return { vendorId: input.vendorId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleDeleteVendor(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateDeleteVendorInput(data);
    return deleteVendor(db, { uid: context.auth.uid }, input);
}
