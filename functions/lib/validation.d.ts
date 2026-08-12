/**
 * Validation utilities for Cloud Functions.
 *
 * These are server-side validation functions used to ensure
 * input data meets requirements before creating documents.
 */
export declare class ValidationError extends Error {
    code: string;
    constructor(code: string, message: string);
}
/**
 * Normalize and validate an organization slug.
 *
 * - Convert to lowercase
 * - Replace spaces and underscores with hyphens
 * - Remove invalid characters
 * - Validate length
 */
export declare function normalizeAndValidateSlug(slug: string): string;
/**
 * Validate organization name.
 */
export declare function validateOrganizationName(name: string | unknown): void;
/**
 * Validate optional organization description.
 */
export declare function validateOrganizationDescription(description: string | undefined | unknown): void;
/**
 * Validate optional contact email.
 */
export declare function validateContactEmail(email: string | undefined | unknown): void;
/**
 * Validate optional contact phone.
 */
export declare function validateContactPhone(phone: string | undefined | unknown): void;
/**
 * Validate event name.
 */
export declare function validateEventName(name: string | unknown): void;
/**
 * Validate event type.
 */
export declare function validateEventType(type: string | unknown, validTypes: readonly string[]): void;
/**
 * Validate required start date (ISO 8601 string).
 */
export declare function validateStartDate(startDate: string | unknown): void;
/**
 * Validate optional end date (ISO 8601 string).
 * If provided, it must not be before the start date.
 */
export declare function validateEndDate(endDate: string | undefined | unknown, startDate: string): void;
/**
 * Validate timezone.
 */
export declare function validateTimezone(timezone: string | unknown): void;
/**
 * Validate optional venue name.
 */
export declare function validateVenueName(venueName: string | undefined | unknown): void;
/**
 * Validate optional venue address.
 */
export declare function validateVenueAddress(venueAddress: string | undefined | unknown): void;
