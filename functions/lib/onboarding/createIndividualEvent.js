"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventMembershipId = getEventMembershipId;
exports.validateCreateIndividualEventInput = validateCreateIndividualEventInput;
exports.buildEventDocument = buildEventDocument;
exports.buildEventMemberDocument = buildEventMemberDocument;
exports.createIndividualEvent = createIndividualEvent;
const validation_1 = require("../validation");
const VALID_EVENT_TYPES = ['wedding', 'social', 'corporate', 'private', 'other'];
/**
 * Helper to create the event membership ID (deterministic).
 */
function getEventMembershipId(eventId, userId) {
    return `${eventId}_${userId}`;
}
/**
 * Validate the input for createIndividualEvent.
 * Throws ValidationError if any field is invalid.
 */
function validateCreateIndividualEventInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    (0, validation_1.validateEventName)(obj.name);
    (0, validation_1.validateEventType)(obj.type, VALID_EVENT_TYPES);
    (0, validation_1.validateStartDate)(obj.startDate);
    (0, validation_1.validateEndDate)(obj.endDate, obj.startDate);
    (0, validation_1.validateTimezone)(obj.timezone);
    (0, validation_1.validateVenueName)(obj.venueName);
    (0, validation_1.validateVenueAddress)(obj.venueAddress);
    return {
        name: obj.name,
        type: obj.type,
        description: obj.description,
        startDate: obj.startDate,
        endDate: obj.endDate,
        timezone: obj.timezone,
        venueName: obj.venueName,
        venueAddress: obj.venueAddress
    };
}
/**
 * Build a Firestore event document.
 *
 * - organizationId is null (individual event)
 * - createdBy is the authenticated user
 * - status is draft
 */
function buildEventDocument(eventId, userId, input, now) {
    return {
        id: eventId,
        name: input.name,
        type: input.type,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        timezone: input.timezone,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        organizationId: null,
        createdBy: userId,
        status: 'draft',
        createdAt: now,
        updatedAt: now
    };
}
/**
 * Build a Firestore event member document.
 *
 * - role is owner
 * - status is active
 * - invitedBy is null (creator, not invited)
 */
function buildEventMemberDocument(membershipId, eventId, userId, now) {
    return {
        id: membershipId,
        eventId,
        userId,
        role: 'owner',
        status: 'active',
        invitedBy: null,
        createdAt: now,
        updatedAt: now
    };
}
/**
 * Atomically create an event and its owner membership.
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
    // Generate event ID (Firestore will auto-generate)
    const eventRef = db.collection('events').doc();
    const eventId = eventRef.id;
    // Build membership ID (deterministic)
    const membershipId = getEventMembershipId(eventId, userId);
    const membershipRef = db.collection('eventMembers').doc(membershipId);
    // Execute atomically
    const batch = db.batch();
    batch.set(eventRef, buildEventDocument(eventId, userId, input, now));
    batch.set(membershipRef, buildEventMemberDocument(membershipId, eventId, userId, now));
    await batch.commit();
    return {
        eventId,
        membershipId
    };
}
