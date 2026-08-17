"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateEventInput = validateUpdateEventInput;
exports.updateEvent = updateEvent;
exports.handleUpdateEvent = handleUpdateEvent;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateUpdateEventInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateEventEditFields)(obj);
    return { eventId: obj.eventId, ...fields };
}
/**
 * Updates an event's name/type/description/dates/timezone/venue/status
 * after verifying the caller has event management authority (owner/
 * planner only). A full document replacement (see
 * `buildEventUpdateDocument`), so clearing an optional field (e.g.
 * removing a venue) actually removes it. `budgetAmount` and
 * `coverImageUrl` are carried over unchanged from the existing
 * document — this function never touches either; they have their own
 * dedicated update functions (`updateEventBudget`,
 * `updateEventCoverImage`). `organizationId`, `createdBy`, and
 * `createdAt` are always read from the existing document, never from
 * the client payload.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 */
async function updateEvent(db, auth, input) {
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, auth.uid);
    const eventRef = db.collection('events').doc(input.eventId);
    const snapshot = await eventRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing) {
        throw new validation_1.ValidationError('event_not_found', 'Event not found.');
    }
    const now = new Date().toISOString();
    await eventRef.set((0, shared_1.buildEventUpdateDocument)(input.eventId, existing.createdBy ?? auth.uid, existing.organizationId ?? null, input, existing.createdAt ?? now, now, { budgetAmount: existing.budgetAmount, coverImageUrl: existing.coverImageUrl }));
    return { eventId: input.eventId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateEvent(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateEventInput(data);
    return updateEvent(db, { uid: context.auth.uid }, input);
}
