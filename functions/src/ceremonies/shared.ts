/**
 * Shared building blocks for event functions/ceremonies (a wedding's
 * Mehndi, Haldi, Sangeet, the Wedding itself, Reception, ...).
 *
 * Named "ceremonies" here (not "functions", which would collide with this
 * package's own directory name and the JS/TS `Function` type) even though
 * the Firestore collection and the domain concept are both called
 * "function" — see docs/functions.md.
 *
 * createFunction and updateFunction both validate the same fields and
 * build the same document shape, so both live here rather than being
 * duplicated.
 */
import { ValidationError } from '../validation';

export const CEREMONY_STATUSES = ['planned', 'confirmed', 'completed', 'cancelled'] as const;

const NAME_MIN = 1;
const NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;
const VENUE_MAX = 200;
const NOTES_MAX = 1000;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface CeremonyFields {
  name: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
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

function validateDescription(description: unknown): string | undefined {
  if (description === undefined || description === null) {
    return undefined;
  }

  if (typeof description !== 'string') {
    throw new ValidationError('invalid_description', 'Description must be a string.');
  }

  if (description.length > DESCRIPTION_MAX) {
    throw new ValidationError('invalid_description', `Description must be at most ${DESCRIPTION_MAX} characters.`);
  }

  return description;
}

function validateDate(date: unknown): string | undefined {
  if (date === undefined || date === null) {
    return undefined;
  }

  if (typeof date !== 'string' || isNaN(new Date(date).getTime())) {
    throw new ValidationError('invalid_date', 'Date must be a valid date string.');
  }

  return date;
}

function validateTime(time: unknown, code: string, label: string): string | undefined {
  if (time === undefined || time === null) {
    return undefined;
  }

  if (typeof time !== 'string' || !TIME_REGEX.test(time)) {
    throw new ValidationError(code, `${label} must be a 24-hour "HH:MM" time.`);
  }

  return time;
}

/**
 * If both times are given, rejects an end time earlier than the start
 * time. Equal start/end is allowed (a zero-length slot isn't this
 * validator's problem to have an opinion about).
 */
function assertValidTimeRange(startTime: string | undefined, endTime: string | undefined): void {
  if (!startTime || !endTime) {
    return;
  }

  if (endTime < startTime) {
    throw new ValidationError('invalid_time_range', 'End time cannot be before start time.');
  }
}

function validateVenue(venue: unknown): string | undefined {
  if (venue === undefined || venue === null) {
    return undefined;
  }

  if (typeof venue !== 'string') {
    throw new ValidationError('invalid_venue', 'Venue must be a string.');
  }

  if (venue.length > VENUE_MAX) {
    throw new ValidationError('invalid_venue', `Venue must be at most ${VENUE_MAX} characters.`);
  }

  return venue;
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
    return 'planned';
  }

  if (typeof status !== 'string' || !CEREMONY_STATUSES.includes(status as (typeof CEREMONY_STATUSES)[number])) {
    throw new ValidationError('invalid_status', `Status must be one of: ${CEREMONY_STATUSES.join(', ')}`);
  }

  return status;
}

/** Validates the fields common to creating and editing a function/ceremony. Throws ValidationError. */
export function validateCeremonyFields(obj: Record<string, unknown>): CeremonyFields {
  const name = validateName(obj.name);
  const description = validateDescription(obj.description);
  const date = validateDate(obj.date);
  const startTime = validateTime(obj.startTime, 'invalid_start_time', 'Start time');
  const endTime = validateTime(obj.endTime, 'invalid_end_time', 'End time');
  assertValidTimeRange(startTime, endTime);
  const venue = validateVenue(obj.venue);
  const notes = validateNotes(obj.notes);
  const status = validateStatus(obj.status);

  return { name, description, date, startTime, endTime, venue, notes, status };
}

/**
 * Builds a Firestore function/ceremony document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createFunction passes
 * the authenticated uid and "now"; updateFunction passes the existing
 * document's values, so an edit can never change who created it or when.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export function buildCeremonyDocument(
  ceremonyId: string,
  eventId: string,
  createdBy: string,
  fields: CeremonyFields,
  createdAt: string,
  updatedAt: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: ceremonyId,
    eventId,
    name: fields.name,
    status: fields.status,
    createdBy,
    createdAt,
    updatedAt
  };

  if (fields.description !== undefined) {
    doc.description = fields.description;
  }
  if (fields.date !== undefined) {
    doc.date = fields.date;
  }
  if (fields.startTime !== undefined) {
    doc.startTime = fields.startTime;
  }
  if (fields.endTime !== undefined) {
    doc.endTime = fields.endTime;
  }
  if (fields.venue !== undefined) {
    doc.venue = fields.venue;
  }
  if (fields.notes !== undefined) {
    doc.notes = fields.notes;
  }

  return doc;
}
