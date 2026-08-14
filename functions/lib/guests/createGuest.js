"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateGuestInput = validateCreateGuestInput;
exports.createGuest = createGuest;
exports.handleCreateGuest = handleCreateGuest;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const authorization_1 = require("./authorization");
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
 * Creates a guest after verifying the caller may create a guest of the
 * requested side for the event: owner/planner may create any side; a
 * couple member (bride/groom) only bride/both or groom/both respectively;
 * family/staff/viewer may not create at all. The client never chooses
 * `id`, `createdBy`, or the timestamps.
 */
async function createGuest(db, auth, input) {
    const userId = auth.uid;
    const membership = await (0, eventAuthority_1.loadActiveEventMembership)(db, input.eventId, userId);
    (0, authorization_1.assertCanCreateGuest)(membership, input.side);
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
