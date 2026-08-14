import { ValidationError } from '../validation';
import {
  CallableAuthContext,
  buildEventMemberDocument,
  getEventMembershipId,
  validateEventCreationFields,
  buildEventDocument as buildEventDocumentBase
} from './shared';

export type CreateIndividualEventInput = ReturnType<typeof validateEventCreationFields>;

export interface CreateIndividualEventOutput {
  eventId: string;
  membershipId: string;
}

interface AuthContext {
  uid: string;
}

export { getEventMembershipId, buildEventMemberDocument };

/**
 * Validate the input for createIndividualEvent.
 * Throws ValidationError if any field is invalid.
 */
export function validateCreateIndividualEventInput(input: unknown): CreateIndividualEventInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  return validateEventCreationFields(input as Record<string, unknown>);
}

/**
 * Build a Firestore event document for an individual event.
 *
 * organizationId is always null — this is what makes the event individual.
 */
export function buildEventDocument(
  eventId: string,
  userId: string,
  input: CreateIndividualEventInput,
  now: string
): Record<string, unknown> {
  return buildEventDocumentBase(eventId, userId, null, input, now);
}

/**
 * Atomically create an individual event and its owner membership.
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

  const eventRef = db.collection('events').doc();
  const eventId = eventRef.id;

  const membershipId = getEventMembershipId(eventId, userId);
  const membershipRef = db.collection('eventMembers').doc(membershipId);

  const batch = db.batch();
  batch.set(eventRef, buildEventDocument(eventId, userId, input, now));
  batch.set(membershipRef, buildEventMemberDocument(membershipId, eventId, userId, now));
  await batch.commit();

  return { eventId, membershipId };
}

/**
 * Callable-function orchestration: authenticate, validate, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK. Reused
 * by both the onboarding individual-event step and the post-onboarding
 * "Create Event" flow — there is only one way to create an individual event.
 */
export async function handleCreateIndividualEvent(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateIndividualEventOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateIndividualEventInput(data);
  return createIndividualEvent(db, { uid: context.auth.uid }, input);
}
