/**
 * Shared building blocks for vendor management.
 *
 * createVendor and updateVendor both validate the same fields and build
 * the same document shape, so both live here rather than being
 * duplicated.
 */
import { ValidationError, validateContactEmail } from '../validation';

export const VENDOR_CATEGORIES = [
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
] as const;

export const VENDOR_STATUSES = ['enquiry', 'shortlisted', 'confirmed', 'cancelled'] as const;

const NAME_MIN = 1;
const NAME_MAX = 200;
const PHONE_MAX = 30;
const NOTES_MAX = 1000;

export interface VendorFields {
  name: string;
  category: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: string;
}

function validateName(name: unknown): string {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('invalid_name', 'Name must be a non-empty string.');
  }

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    throw new ValidationError('invalid_name', `Name must be between ${NAME_MIN} and ${NAME_MAX} characters.`);
  }

  return name;
}

function validateCategory(category: unknown): string {
  if (!category || typeof category !== 'string' || !VENDOR_CATEGORIES.includes(category as (typeof VENDOR_CATEGORIES)[number])) {
    throw new ValidationError('invalid_category', `Category must be one of: ${VENDOR_CATEGORIES.join(', ')}`);
  }

  return category;
}

function validatePhone(phone: unknown): string | undefined {
  if (phone === undefined || phone === null) {
    return undefined;
  }

  if (typeof phone !== 'string') {
    throw new ValidationError('invalid_phone', 'Phone must be a string.');
  }

  if (phone.length > PHONE_MAX) {
    throw new ValidationError('invalid_phone', `Phone must be at most ${PHONE_MAX} characters.`);
  }

  return phone;
}

function validateNotes(notes: unknown): string | undefined {
  if (notes === undefined || notes === null) {
    return undefined;
  }

  if (typeof notes !== 'string') {
    throw new ValidationError('invalid_notes', 'Notes must be a string.');
  }

  if (notes.length > NOTES_MAX) {
    throw new ValidationError('invalid_notes', `Notes must be at most ${NOTES_MAX} characters.`);
  }

  return notes;
}

function validateStatus(status: unknown): string {
  if (status === undefined || status === null) {
    return 'enquiry';
  }

  if (typeof status !== 'string' || !VENDOR_STATUSES.includes(status as (typeof VENDOR_STATUSES)[number])) {
    throw new ValidationError('invalid_status', `Status must be one of: ${VENDOR_STATUSES.join(', ')}`);
  }

  return status;
}

/** Validates the fields common to vendor creation and editing. Throws ValidationError. */
export function validateVendorFields(obj: Record<string, unknown>): VendorFields {
  const name = validateName(obj.name);
  const category = validateCategory(obj.category);
  const phone = validatePhone(obj.phone);
  validateContactEmail(obj.email);
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
export function buildVendorDocument(
  vendorId: string,
  eventId: string,
  createdBy: string,
  fields: VendorFields,
  createdAt: string,
  updatedAt: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
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
