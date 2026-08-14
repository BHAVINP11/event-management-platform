import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
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
 * Creates a guest after verifying the caller has a management role (owner
 * or planner) for the event. The client never chooses `id`, `createdBy`, or
 * the timestamps.
 */
export async function createGuest(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateGuestInput
): Promise<CreateGuestOutput> {
  const userId = auth.uid;

  await verifyEventManagementAuthority(db, input.eventId, userId);

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
