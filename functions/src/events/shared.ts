/**
 * Shared building blocks for trusted event creation.
 *
 * Both createIndividualEvent and createOrganizationEvent create the same two
 * documents — an Event and its owning EventMember — and validate the same
 * event fields. This module is the single place that does so, so the two
 * creation flows cannot drift apart.
 */
import {
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
