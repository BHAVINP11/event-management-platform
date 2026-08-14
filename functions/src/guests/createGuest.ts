import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { loadActiveEventMembership } from '../shared/eventAuthority';
import { assertCanCreateGuest } from './authorization';
import { GuestFields, buildGuestDocument, validateGuestFields } from './shared';

export interface CreateGuestInput extends GuestFields {
  eventId: string;
}

export interface CreateGuestOutput {
  guestId: string;
}

interface AuthContext {
  uid: string;
}

export function validateCreateGuestInput(input: unknown): CreateGuestInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateGuestFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Creates a guest after verifying the caller may create a guest of the
 * requested side for the event: owner/planner may create any side; a
 * couple member (bride/groom) only bride/both or groom/both respectively;
 * family/staff/viewer may not create at all. The client never chooses
 * `id`, `createdBy`, or the timestamps.
 */
export async function createGuest(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateGuestInput
): Promise<CreateGuestOutput> {
  const userId = auth.uid;

  const membership = await loadActiveEventMembership(db, input.eventId, userId);
  assertCanCreateGuest(membership, input.side);

  const now = new Date().toISOString();
  const guestRef = db.collection('guests').doc();
  const guestId = guestRef.id;

  await guestRef.set(buildGuestDocument(guestId, input.eventId, userId, input, now, now));

  return { guestId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateGuest(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateGuestOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateGuestInput(data);
  return createGuest(db, { uid: context.auth.uid }, input);
}
