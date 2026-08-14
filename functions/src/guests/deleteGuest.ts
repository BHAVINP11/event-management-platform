import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

export interface DeleteGuestInput {
  guestId: string;
}

export interface DeleteGuestOutput {
  guestId: string;
}

interface AuthContext {
  uid: string;
}

export function validateDeleteGuestInput(input: unknown): DeleteGuestInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.guestId || typeof obj.guestId !== 'string') {
    throw new ValidationError('invalid_guest_id', 'guestId must be a non-empty string.');
  }

  return { guestId: obj.guestId };
}

/**
 * Deletes a guest after verifying the caller has a management role (owner
 * or planner) for the guest's *stored* event.
 *
 * @throws ValidationError('guest_not_found') if the guest does not exist
 */
export async function deleteGuest(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: DeleteGuestInput
): Promise<DeleteGuestOutput> {
  const guestRef = db.collection('guests').doc(input.guestId);
  const snapshot = await guestRef.get();
  const existing = snapshot.data() as { eventId?: string } | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('guest_not_found', 'Guest not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);
  await guestRef.delete();

  return { guestId: input.guestId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleDeleteGuest(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<DeleteGuestOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateDeleteGuestInput(data);
  return deleteGuest(db, { uid: context.auth.uid }, input);
}
