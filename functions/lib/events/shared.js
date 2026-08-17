"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_EVENT_STATUSES = exports.getEventMembershipId = exports.VALID_EVENT_TYPES = void 0;
exports.validateEventCreationFields = validateEventCreationFields;
exports.buildEventDocument = buildEventDocument;
exports.validateEventEditFields = validateEventEditFields;
exports.buildEventUpdateDocument = buildEventUpdateDocument;
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
const membershipIds_1 = require("../shared/membershipIds");
Object.defineProperty(exports, "getEventMembershipId", { enumerable: true, get: function () { return membershipIds_1.getEventMembershipId; } });
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
exports.VALID_EVENT_STATUSES = ['draft', 'active', 'completed', 'archived'];
/** Validates the fields common to full event edits — the creation fields plus status. */
function validateEventEditFields(obj) {
    const fields = validateEventCreationFields(obj);
    if (!obj.status || typeof obj.status !== 'string' || !exports.VALID_EVENT_STATUSES.includes(obj.status)) {
        throw new validation_1.ValidationError('invalid_status', `Status must be one of: ${exports.VALID_EVENT_STATUSES.join(', ')}`);
    }
    return { ...fields, status: obj.status };
}
/**
 * Builds the full replacement Event document for an edit (name/type/
 * description/dates/timezone/venue/status). A full `.set()`, not a
 * partial `.update()` — matching `buildGuestDocument`'s approach — so
 * clearing an optional field (e.g. removing a venue) actually removes it
 * rather than leaving stale data, with no `FieldValue.delete()` sentinel
 * needed. `budgetAmount` and `coverImageUrl` are never touched here —
 * they have their own dedicated update functions — so the caller must
 * pass through whatever the existing document already has for both.
 */
function buildEventUpdateDocument(eventId, createdBy, organizationId, input, createdAt, now, existing) {
    const doc = {
        id: eventId,
        name: input.name,
        type: input.type,
        startDate: input.startDate,
        timezone: input.timezone,
        organizationId,
        createdBy,
        status: input.status,
        createdAt,
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
    if (existing.budgetAmount !== undefined) {
        doc.budgetAmount = existing.budgetAmount;
    }
    if (existing.coverImageUrl !== undefined && existing.coverImageUrl !== null) {
        doc.coverImageUrl = existing.coverImageUrl;
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
