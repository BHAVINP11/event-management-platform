"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_STATUSES = exports.GUEST_SIDES = void 0;
exports.validateGuestFields = validateGuestFields;
exports.buildGuestDocument = buildGuestDocument;
/**
 * Shared building blocks for guest management.
 *
 * createGuest and updateGuest both validate the same fields and build the
 * same document shape, so both live here rather than being duplicated.
 */
const validation_1 = require("../validation");
exports.GUEST_SIDES = ['bride', 'groom', 'both'];
exports.GUEST_STATUSES = ['pending', 'invited', 'confirmed', 'declined'];
const GUEST_NAME_MIN = 1;
const GUEST_NAME_MAX = 200;
const GUEST_PHONE_MAX = 30;
const GUEST_RELATION_MAX = 100;
const GUEST_NOTES_MAX = 1000;
function validateGuestName(name) {
    if (!name || typeof name !== 'string') {
        throw new validation_1.ValidationError('invalid_name', 'Guest name must be a non-empty string.');
    }
    if (name.length < GUEST_NAME_MIN || name.length > GUEST_NAME_MAX) {
        throw new validation_1.ValidationError('invalid_name', `Guest name must be between ${GUEST_NAME_MIN} and ${GUEST_NAME_MAX} characters.`);
    }
    return name;
}
function validateGuestPhone(phone) {
    if (phone === undefined || phone === null) {
        return undefined;
    }
    if (typeof phone !== 'string') {
        throw new validation_1.ValidationError('invalid_phone', 'Phone must be a string.');
    }
    if (phone.length > GUEST_PHONE_MAX) {
        throw new validation_1.ValidationError('invalid_phone', `Phone must be at most ${GUEST_PHONE_MAX} characters.`);
    }
    return phone;
}
function validateGuestSide(side) {
    if (!side || typeof side !== 'string' || !exports.GUEST_SIDES.includes(side)) {
        throw new validation_1.ValidationError('invalid_side', `Side must be one of: ${exports.GUEST_SIDES.join(', ')}`);
    }
    return side;
}
function validateGuestStatus(status) {
    if (status === undefined || status === null) {
        return 'pending';
    }
    if (typeof status !== 'string' || !exports.GUEST_STATUSES.includes(status)) {
        throw new validation_1.ValidationError('invalid_status', `Status must be one of: ${exports.GUEST_STATUSES.join(', ')}`);
    }
    return status;
}
function validateGuestRelation(relation) {
    if (relation === undefined || relation === null) {
        return undefined;
    }
    if (typeof relation !== 'string') {
        throw new validation_1.ValidationError('invalid_relation', 'Relation must be a string.');
    }
    if (relation.length > GUEST_RELATION_MAX) {
        throw new validation_1.ValidationError('invalid_relation', `Relation must be at most ${GUEST_RELATION_MAX} characters.`);
    }
    return relation;
}
function validateGuestNotes(notes) {
    if (notes === undefined || notes === null) {
        return undefined;
    }
    if (typeof notes !== 'string') {
        throw new validation_1.ValidationError('invalid_notes', 'Notes must be a string.');
    }
    if (notes.length > GUEST_NOTES_MAX) {
        throw new validation_1.ValidationError('invalid_notes', `Notes must be at most ${GUEST_NOTES_MAX} characters.`);
    }
    return notes;
}
/** Validates the fields common to guest creation and editing. Throws ValidationError. */
function validateGuestFields(obj) {
    const name = validateGuestName(obj.name);
    const phone = validateGuestPhone(obj.phone);
    (0, validation_1.validateContactEmail)(obj.email);
    const side = validateGuestSide(obj.side);
    const relation = validateGuestRelation(obj.relation);
    const notes = validateGuestNotes(obj.notes);
    const status = validateGuestStatus(obj.status);
    return {
        name,
        phone,
        email: typeof obj.email === 'string' ? obj.email : undefined,
        side,
        relation,
        notes,
        status
    };
}
/**
 * Builds a Firestore guest document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createGuest passes the
 * authenticated uid and "now"; updateGuest passes the existing document's
 * values, so an edit can never change who created a guest or when. Optional
 * fields are omitted rather than stored as `undefined`.
 */
function buildGuestDocument(guestId, eventId, createdBy, fields, createdAt, updatedAt) {
    const doc = {
        id: guestId,
        eventId,
        name: fields.name,
        side: fields.side,
        status: fields.status,
        createdBy,
        createdAt,
        updatedAt
    };
    if (fields.phone !== undefined) {
        doc.phone = fields.phone;
    }
    if (fields.email !== undefined) {
        doc.email = fields.email;
    }
    if (fields.relation !== undefined) {
        doc.relation = fields.relation;
    }
    if (fields.notes !== undefined) {
        doc.notes = fields.notes;
    }
    return doc;
}
