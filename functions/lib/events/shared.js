"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_EVENT_TYPES = void 0;
exports.validateEventCreationFields = validateEventCreationFields;
exports.getEventMembershipId = getEventMembershipId;
exports.buildEventDocument = buildEventDocument;
exports.buildEventMemberDocument = buildEventMemberDocument;
/**
 * Shared building blocks for trusted event creation.
 *
 * Both createIndividualEvent and createOrganizationEvent create the same two
 * documents — an Event and its owning EventMember — and validate the same
 * event fields. This module is the single place that does so, so the two
 * creation flows cannot drift apart.
 */
const validation_1 = require("../validation");
exports.VALID_EVENT_TYPES = ['wedding', 'social', 'corporate', 'private', 'other'];
/** Validates the fields common to both creation flows. Throws ValidationError. */
function validateEventCreationFields(obj) {
    (0, validation_1.validateEventName)(obj.name);
    (0, validation_1.validateEventType)(obj.type, exports.VALID_EVENT_TYPES);
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
/** Deterministic event membership ID: `${eventId}_${userId}`. */
function getEventMembershipId(eventId, userId) {
    return `${eventId}_${userId}`;
}
/**
 * Builds a Firestore event document.
 *
 * `organizationId` is passed explicitly rather than inferred, so callers
 * cannot accidentally create an organization event without deciding to.
 * `status` is always `draft` — the client never chooses the initial status.
 * Optional fields are omitted rather than stored as `undefined`.
 */
function buildEventDocument(eventId, userId, organizationId, input, now) {
    const doc = {
        id: eventId,
        name: input.name,
        type: input.type,
        startDate: input.startDate,
        timezone: input.timezone,
        organizationId,
        createdBy: userId,
        status: 'draft',
        createdAt: now,
        updatedAt: now
    };
    if (input.description !== undefined) {
        doc.description = input.description;
    }
    if (input.endDate !== undefined) {
        doc.endDate = input.endDate;
    }
    if (input.venueName !== undefined) {
        doc.venueName = input.venueName;
    }
    if (input.venueAddress !== undefined) {
        doc.venueAddress = input.venueAddress;
    }
    return doc;
}
/**
 * Builds the creator's EventMember document.
 *
 * The creator is always `owner` / `active` / not invited — the client never
 * chooses its own role or status.
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
