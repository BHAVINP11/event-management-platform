"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateGuestInput = validateUpdateGuestInput;
exports.updateGuest = updateGuest;
exports.handleUpdateGuest = handleUpdateGuest;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateUpdateGuestInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.guestId || typeof obj.guestId !== 'string') {
        throw new validation_1.ValidationError('invalid_guest_id', 'guestId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateGuestFields)(obj);
    return { guestId: obj.guestId, ...fields };
}
/**
 * Updates a guest after verifying the caller has a management role (owner
 * or planner) for the guest's *stored* event — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event. `id`,
 * `eventId`, `createdBy`, and `createdAt` are carried over from the existing
 * document regardless of what the client sends.
 *
 * @throws ValidationError('guest_not_found') if the guest does not exist
 */
async function updateGuest(db, auth, input) {
    const guestRef = db.collection('guests').doc(input.guestId);
    const snapshot = await guestRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('guest_not_found', 'Guest not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
    const now = new Date().toISOString();
    await guestRef.set((0, shared_1.buildGuestDocument)(input.guestId, existing.eventId, existing.createdBy ?? auth.uid, input, existing.createdAt ?? now, now));
    return { guestId: input.guestId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateGuest(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateGuestInput(data);
    return updateGuest(db, { uid: context.auth.uid }, input);
}
