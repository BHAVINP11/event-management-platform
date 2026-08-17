/**
 * Shared building blocks for trusted event creation.
 *
 * Both createIndividualEvent and createOrganizationEvent create the same two
 * documents — an Event and its owning EventMember — and validate the same
 * event fields. This module is the single place that does so, so the two
 * creation flows cannot drift apart.
 */
import {
  ValidationError,
  validateEventName,
  validateEventType,
  validateStartDate,
  validateEndDate,
  validateTimezone,
  validateVenueName,
  validateVenueAddress
} from '../validation';
import { getEventMembershipId } from '../shared/membershipIds';
import { CallableAuthContext } from '../shared/callableContext';

export const VALID_EVENT_TYPES = ['wedding', 'social', 'corporate', 'private', 'other'] as const;

export interface EventCreationFields {
  name: string;
  type: string;
  description?: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
}

export { CallableAuthContext };

/** Validates the fields common to both creation flows. Throws ValidationError. */
export function validateEventCreationFields(obj: Record<string, unknown>): EventCreationFields {
  validateEventName(obj.name);
  validateEventType(obj.type, VALID_EVENT_TYPES);
  validateStartDate(obj.startDate);
  validateEndDate(obj.endDate, obj.startDate as string);
  validateTimezone(obj.timezone);
  validateVenueName(obj.venueName);
  validateVenueAddress(obj.venueAddress);

  return {
    name: obj.name as string,
    type: obj.type as string,
    description: obj.description as string | undefined,
    startDate: obj.startDate as string,
    endDate: obj.endDate as string | undefined,
    timezone: obj.timezone as string,
    venueName: obj.venueName as string | undefined,
    venueAddress: obj.venueAddress as string | undefined
  };
}

export { getEventMembershipId };

/**
 * Builds a Firestore event document.
 *
 * `organizationId` is passed explicitly rather than inferred, so callers
 * cannot accidentally create an organization event without deciding to.
 * `status` is always `draft` — the client never chooses the initial status.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export function buildEventDocument(
  eventId: string,
  userId: string,
  organizationId: string | null,
  input: EventCreationFields,
  now: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
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

export const VALID_EVENT_STATUSES = ['draft', 'active', 'completed', 'archived'] as const;

export interface EventEditFields extends EventCreationFields {
  status: string;
}

/** Validates the fields common to full event edits — the creation fields plus status. */
export function validateEventEditFields(obj: Record<string, unknown>): EventEditFields {
  const fields = validateEventCreationFields(obj);

  if (!obj.status || typeof obj.status !== 'string' || !VALID_EVENT_STATUSES.includes(obj.status as (typeof VALID_EVENT_STATUSES)[number])) {
    throw new ValidationError('invalid_status', `Status must be one of: ${VALID_EVENT_STATUSES.join(', ')}`);
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
export function buildEventUpdateDocument(
  eventId: string,
  createdBy: string,
  organizationId: string | null,
  input: EventEditFields,
  createdAt: string,
  now: string,
  existing: { budgetAmount?: number; coverImageUrl?: string | null }
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
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
export function buildEventMemberDocument(
  membershipId: string,
  eventId: string,
  userId: string,
  now: string
): Record<string, unknown> {
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
