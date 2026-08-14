"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENDOR_STATUSES = exports.VENDOR_CATEGORIES = void 0;
exports.validateVendorFields = validateVendorFields;
exports.buildVendorDocument = buildVendorDocument;
/**
 * Shared building blocks for vendor management.
 *
 * createVendor and updateVendor both validate the same fields and build
 * the same document shape, so both live here rather than being
 * duplicated.
 */
const validation_1 = require("../validation");
exports.VENDOR_CATEGORIES = [
    'venue',
    'catering',
    'decoration',
    'photography',
    'videography',
    'entertainment',
    'transportation',
    'accommodation',
    'jewellery',
    'makeup',
    'invitation',
    'other'
];
exports.VENDOR_STATUSES = ['enquiry', 'shortlisted', 'confirmed', 'cancelled'];
const NAME_MIN = 1;
const NAME_MAX = 200;
const PHONE_MAX = 30;
const NOTES_MAX = 1000;
function validateName(name) {
    if (!name || typeof name !== 'string') {
        throw new validation_1.ValidationError('invalid_name', 'Name must be a non-empty string.');
    }
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
        throw new validation_1.ValidationError('invalid_name', `Name must be between ${NAME_MIN} and ${NAME_MAX} characters.`);
    }
    return name;
}
function validateCategory(category) {
    if (!category || typeof category !== 'string' || !exports.VENDOR_CATEGORIES.includes(category)) {
        throw new validation_1.ValidationError('invalid_category', `Category must be one of: ${exports.VENDOR_CATEGORIES.join(', ')}`);
    }
    return category;
}
function validatePhone(phone) {
    if (phone === undefined || phone === null) {
        return undefined;
    }
    if (typeof phone !== 'string') {
        throw new validation_1.ValidationError('invalid_phone', 'Phone must be a string.');
    }
    if (phone.length > PHONE_MAX) {
        throw new validation_1.ValidationError('invalid_phone', `Phone must be at most ${PHONE_MAX} characters.`);
    }
    return phone;
}
function validateNotes(notes) {
    if (notes === undefined || notes === null) {
        return undefined;
    }
    if (typeof notes !== 'string') {
        throw new validation_1.ValidationError('invalid_notes', 'Notes must be a string.');
    }
    if (notes.length > NOTES_MAX) {
        throw new validation_1.ValidationError('invalid_notes', `Notes must be at most ${NOTES_MAX} characters.`);
    }
    return notes;
}
function validateStatus(status) {
    if (status === undefined || status === null) {
        return 'enquiry';
    }
    if (typeof status !== 'string' || !exports.VENDOR_STATUSES.includes(status)) {
        throw new validation_1.ValidationError('invalid_status', `Status must be one of: ${exports.VENDOR_STATUSES.join(', ')}`);
    }
    return status;
}
/** Validates the fields common to vendor creation and editing. Throws ValidationError. */
function validateVendorFields(obj) {
    const name = validateName(obj.name);
    const category = validateCategory(obj.category);
    const phone = validatePhone(obj.phone);
    (0, validation_1.validateContactEmail)(obj.email);
    const notes = validateNotes(obj.notes);
    const status = validateStatus(obj.status);
    return {
        name,
        category,
        phone,
        email: typeof obj.email === 'string' ? obj.email : undefined,
        notes,
        status
    };
}
/**
 * Builds a Firestore vendor document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createVendor passes
 * the authenticated uid and "now"; updateVendor passes the existing
 * document's values, so an edit can never change who created it or when.
 * Optional fields are omitted rather than stored as `undefined`.
 */
function buildVendorDocument(vendorId, eventId, createdBy, fields, createdAt, updatedAt) {
    const doc = {
        id: vendorId,
        eventId,
        name: fields.name,
        category: fields.category,
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
    if (fields.notes !== undefined) {
        doc.notes = fields.notes;
    }
    return doc;
}
