"use strict";
/**
 * Validation utilities for Cloud Functions.
 *
 * These are server-side validation functions used to ensure
 * input data meets requirements before creating documents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
exports.normalizeAndValidateSlug = normalizeAndValidateSlug;
exports.validateOrganizationName = validateOrganizationName;
exports.validateOrganizationDescription = validateOrganizationDescription;
exports.validateContactEmail = validateContactEmail;
exports.validateContactPhone = validateContactPhone;
exports.validateEventName = validateEventName;
exports.validateEventType = validateEventType;
exports.validateStartDate = validateStartDate;
exports.validateEndDate = validateEndDate;
exports.validateTimezone = validateTimezone;
exports.validateVenueName = validateVenueName;
exports.validateVenueAddress = validateVenueAddress;
const ORGANIZATION_NAME_MIN = 1;
const ORGANIZATION_NAME_MAX = 200;
const ORGANIZATION_SLUG_MIN = 1;
const ORGANIZATION_SLUG_MAX = 100;
const ORGANIZATION_DESCRIPTION_MAX = 1000;
const EVENT_NAME_MIN = 1;
const EVENT_NAME_MAX = 200;
const EVENT_DESCRIPTION_MAX = 2000;
const VENUE_NAME_MAX = 200;
const VENUE_ADDRESS_MAX = 500;
const TIMEZONE_MAX = 100;
class ValidationError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Normalize and validate an organization slug.
 *
 * - Convert to lowercase
 * - Replace spaces and underscores with hyphens
 * - Remove invalid characters
 * - Validate length
 */
function normalizeAndValidateSlug(slug) {
    if (!slug || typeof slug !== 'string') {
        throw new ValidationError('invalid_slug', 'Slug must be a non-empty string.');
    }
    // Normalize: lowercase, replace spaces/underscores with hyphens, remove invalid chars
    let normalized = slug
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    // Remove leading/trailing hyphens
    normalized = normalized.replace(/^-+|-+$/g, '');
    if (normalized.length < ORGANIZATION_SLUG_MIN || normalized.length > ORGANIZATION_SLUG_MAX) {
        throw new ValidationError('invalid_slug', `Slug must be between ${ORGANIZATION_SLUG_MIN} and ${ORGANIZATION_SLUG_MAX} characters.`);
    }
    return normalized;
}
/**
 * Validate organization name.
 */
function validateOrganizationName(name) {
    if (!name || typeof name !== 'string') {
        throw new ValidationError('invalid_name', 'Organization name must be a non-empty string.');
    }
    if (name.length < ORGANIZATION_NAME_MIN || name.length > ORGANIZATION_NAME_MAX) {
        throw new ValidationError('invalid_name', `Organization name must be between ${ORGANIZATION_NAME_MIN} and ${ORGANIZATION_NAME_MAX} characters.`);
    }
}
/**
 * Validate optional organization description.
 */
function validateOrganizationDescription(description) {
    if (description === undefined || description === null) {
        return;
    }
    if (typeof description !== 'string') {
        throw new ValidationError('invalid_description', 'Description must be a string.');
    }
    if (description.length > ORGANIZATION_DESCRIPTION_MAX) {
        throw new ValidationError('invalid_description', `Description must be at most ${ORGANIZATION_DESCRIPTION_MAX} characters.`);
    }
}
/**
 * Validate optional contact email.
 */
function validateContactEmail(email) {
    if (email === undefined || email === null) {
        return;
    }
    if (typeof email !== 'string') {
        throw new ValidationError('invalid_email', 'Email must be a string.');
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError('invalid_email', 'Email format is invalid.');
    }
}
/**
 * Validate optional contact phone.
 */
function validateContactPhone(phone) {
    if (phone === undefined || phone === null) {
        return;
    }
    if (typeof phone !== 'string') {
        throw new ValidationError('invalid_phone', 'Phone must be a string.');
    }
    if (phone.trim().length === 0) {
        throw new ValidationError('invalid_phone', 'Phone cannot be empty.');
    }
}
/**
 * Validate event name.
 */
function validateEventName(name) {
    if (!name || typeof name !== 'string') {
        throw new ValidationError('invalid_name', 'Event name must be a non-empty string.');
    }
    if (name.length < EVENT_NAME_MIN || name.length > EVENT_NAME_MAX) {
        throw new ValidationError('invalid_name', `Event name must be between ${EVENT_NAME_MIN} and ${EVENT_NAME_MAX} characters.`);
    }
}
/**
 * Validate event type.
 */
function validateEventType(type, validTypes) {
    if (!type || typeof type !== 'string') {
        throw new ValidationError('invalid_type', 'Event type must be a non-empty string.');
    }
    if (!validTypes.includes(type)) {
        throw new ValidationError('invalid_type', `Event type must be one of: ${validTypes.join(', ')}`);
    }
}
/**
 * Validate required start date (ISO 8601 string).
 */
function validateStartDate(startDate) {
    if (!startDate || typeof startDate !== 'string') {
        throw new ValidationError('invalid_start_date', 'Start date must be a non-empty ISO 8601 string.');
    }
    const date = new Date(startDate);
    if (isNaN(date.getTime())) {
        throw new ValidationError('invalid_start_date', 'Start date must be a valid ISO 8601 date.');
    }
}
/**
 * Validate optional end date (ISO 8601 string).
 * If provided, it must not be before the start date.
 */
function validateEndDate(endDate, startDate) {
    if (endDate === undefined || endDate === null) {
        return;
    }
    if (typeof endDate !== 'string') {
        throw new ValidationError('invalid_end_date', 'End date must be an ISO 8601 string.');
    }
    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
        throw new ValidationError('invalid_end_date', 'End date must be a valid ISO 8601 date.');
    }
    const startDateObj = new Date(startDate);
    if (endDateObj < startDateObj) {
        throw new ValidationError('invalid_end_date', 'End date cannot be before start date.');
    }
}
/**
 * Validate timezone.
 */
function validateTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') {
        throw new ValidationError('invalid_timezone', 'Timezone must be a non-empty string.');
    }
    if (timezone.length > TIMEZONE_MAX) {
        throw new ValidationError('invalid_timezone', `Timezone must be at most ${TIMEZONE_MAX} characters.`);
    }
}
/**
 * Validate optional venue name.
 */
function validateVenueName(venueName) {
    if (venueName === undefined || venueName === null) {
        return;
    }
    if (typeof venueName !== 'string') {
        throw new ValidationError('invalid_venue_name', 'Venue name must be a string.');
    }
    if (venueName.length > VENUE_NAME_MAX) {
        throw new ValidationError('invalid_venue_name', `Venue name must be at most ${VENUE_NAME_MAX} characters.`);
    }
}
/**
 * Validate optional venue address.
 */
function validateVenueAddress(venueAddress) {
    if (venueAddress === undefined || venueAddress === null) {
        return;
    }
    if (typeof venueAddress !== 'string') {
        throw new ValidationError('invalid_venue_address', 'Venue address must be a string.');
    }
    if (venueAddress.length > VENUE_ADDRESS_MAX) {
        throw new ValidationError('invalid_venue_address', `Venue address must be at most ${VENUE_ADDRESS_MAX} characters.`);
    }
}
