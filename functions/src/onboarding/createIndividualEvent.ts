import {
  validateEventName,
  validateEventType,
  validateStartDate,
  validateEndDate,
  validateTimezone,
  validateVenueName,
  validateVenueAddress,
  ValidationError
} from '../validation';

export interface CreateIndividualEventInput {
  name: string;
  type: string;
  description?: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
}

export interface CreateIndividualEventOutput {
  eventId: string;
  membershipId: string;
}

interface AuthContext {
  uid: string;
}

const VALID_EVENT_TYPES = ['wedding', 'social', 'corporate', 'private', 'other'] as const;

/**
 * Helper to create the event membership ID (deterministic).
 */
export function getEventMembershipId(eventId: string, userId: string): string {
  return `${eventId}_${userId}`;
}

/**
 * Validate the input for createIndividualEvent.
 * Throws ValidationError if any field is invalid.
 */
export function validateCreateIndividualEventInput(input: unknown): CreateIndividualEventInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

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

/**
 * Build a Firestore event document.
 * 
 * - organizationId is null (individual event)
 * - createdBy is the authenticated user
 * - status is draft
 */
export function buildEventDocument(
  eventId: string,
  userId: string,
  input: CreateIndividualEventInput,
  now: string
): Record<string, unknown> {
  return {
    id: eventId,
    name: input.name,
    type: input.type,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    timezone: input.timezone,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    organizationId: null,
    createdBy: userId,
    status: 'draft',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Build a Firestore event member document.
 * 
 * - role is owner
 * - status is active
 * - invitedBy is null (creator, not invited)
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

/**
 * Atomically create an event and its owner membership.
 * 
 * @param db Firestore database instance (from Admin SDK)
 * @param auth Authentication context with uid
 * @param input Validated input payload
 * @returns Created event ID and membership ID
 * 
 * @throws Error if Firestore transaction fails
 */
export async function createIndividualEvent(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateIndividualEventInput
): Promise<CreateIndividualEventOutput> {
  const userId = auth.uid;
  const now = new Date().toISOString();

  // Generate event ID (Firestore will auto-generate)
  const eventRef = db.collection('events').doc();
  const eventId = eventRef.id;

  // Build membership ID (deterministic)
  const membershipId = getEventMembershipId(eventId, userId);
  const membershipRef = db.collection('eventMembers').doc(membershipId);

  // Execute atomically
  const batch = db.batch();

  batch.set(
    eventRef,
    buildEventDocument(eventId, userId, input, now)
  );

  batch.set(
    membershipRef,
    buildEventMemberDocument(membershipId, eventId, userId, now)
  );

  await batch.commit();

  return {
    eventId,
    membershipId
  };
}
