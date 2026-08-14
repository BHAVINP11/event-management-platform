"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeleteGuestInput = validateDeleteGuestInput;
exports.deleteGuest = deleteGuest;
exports.handleDeleteGuest = handleDeleteGuest;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const authorization_1 = require("./authorization");
function validateDeleteGuestInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.guestId || typeof obj.guestId !== 'string') {
        throw new validation_1.ValidationError('invalid_guest_id', 'guestId must be a non-empty string.');
    }
    return { guestId: obj.guestId };
}
/**
 * Deletes a guest after verifying the caller may delete it, checked
 * against the guest's *stored* eventId and side — never a client-supplied
 * value.
 *
 * @throws ValidationError('guest_not_found') if the guest does not exist
 */
async function deleteGuest(db, auth, input) {
    const guestRef = db.collection('guests').doc(input.guestId);
    const snapshot = await guestRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId || !existing.side) {
        throw new validation_1.ValidationError('guest_not_found', 'Guest not found.');
    }
    const membership = await (0, eventAuthority_1.loadActiveEventMembership)(db, existing.eventId, auth.uid);
    (0, authorization_1.assertCanDeleteGuest)(membership, existing.side);
    await guestRef.delete();
    return { guestId: input.guestId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleDeleteGuest(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateDeleteGuestInput(data);
    return deleteGuest(db, { uid: context.auth.uid }, input);
}
