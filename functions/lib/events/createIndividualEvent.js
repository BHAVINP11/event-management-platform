"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEventMemberDocument = exports.getEventMembershipId = void 0;
exports.validateCreateIndividualEventInput = validateCreateIndividualEventInput;
exports.buildEventDocument = buildEventDocument;
exports.createIndividualEvent = createIndividualEvent;
exports.handleCreateIndividualEvent = handleCreateIndividualEvent;
const validation_1 = require("../validation");
const shared_1 = require("./shared");
Object.defineProperty(exports, "buildEventMemberDocument", { enumerable: true, get: function () { return shared_1.buildEventMemberDocument; } });
Object.defineProperty(exports, "getEventMembershipId", { enumerable: true, get: function () { return shared_1.getEventMembershipId; } });
/**
 * Validate the input for createIndividualEvent.
 * Throws ValidationError if any field is invalid.
 */
function validateCreateIndividualEventInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    return (0, shared_1.validateEventCreationFields)(input);
}
/**
 * Build a Firestore event document for an individual event.
 *
 * organizationId is always null — this is what makes the event individual.
 */
function buildEventDocument(eventId, userId, input, now) {
    return (0, shared_1.buildEventDocument)(eventId, userId, null, input, now);
}
/**
 * Atomically create an individual event and its owner membership.
 *
 * @param db Firestore database instance (from Admin SDK)
 * @param auth Authentication context with uid
 * @param input Validated input payload
 * @returns Created event ID and membership ID
 *
 * @throws Error if Firestore transaction fails
 */
async function createIndividualEvent(db, auth, input) {
    const userId = auth.uid;
    const now = new Date().toISOString();
    const eventRef = db.collection('events').doc();
    const eventId = eventRef.id;
    const membershipId = (0, shared_1.getEventMembershipId)(eventId, userId);
    const membershipRef = db.collection('eventMembers').doc(membershipId);
    const batch = db.batch();
    batch.set(eventRef, buildEventDocument(eventId, userId, input, now));
    batch.set(membershipRef, (0, shared_1.buildEventMemberDocument)(membershipId, eventId, userId, now));
    await batch.commit();
    return { eventId, membershipId };
}
/**
 * Callable-function orchestration: authenticate, validate, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK. Reused
 * by both the onboarding individual-event step and the post-onboarding
 * "Create Event" flow — there is only one way to create an individual event.
 */
async function handleCreateIndividualEvent(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateIndividualEventInput(data);
    return createIndividualEvent(db, { uid: context.auth.uid }, input);
}
