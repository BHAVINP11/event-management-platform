"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateGuestInput = validateCreateGuestInput;
exports.createGuest = createGuest;
exports.handleCreateGuest = handleCreateGuest;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateCreateGuestInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateGuestFields)(obj);
    return { eventId: obj.eventId, ...fields };
}
/**
 * Creates a guest after verifying the caller has a management role (owner
 * or planner) for the event. The client never chooses `id`, `createdBy`, or
 * the timestamps.
 */
async function createGuest(db, auth, input) {
    const userId = auth.uid;
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, userId);
    const now = new Date().toISOString();
    const guestRef = db.collection('guests').doc();
    const guestId = guestRef.id;
    await guestRef.set((0, shared_1.buildGuestDocument)(guestId, input.eventId, userId, input, now, now));
    return { guestId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleCreateGuest(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateGuestInput(data);
    return createGuest(db, { uid: context.auth.uid }, input);
}
