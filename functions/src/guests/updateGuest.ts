import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { GuestFields, buildGuestDocument, validateGuestFields } from './shared';

export interface UpdateGuestInput extends GuestFields {
  guestId: string;
}

export interface UpdateGuestOutput {
  guestId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingGuestData {
  eventId?: string;
  createdBy?: string;
  createdAt?: string;
}

export function validateUpdateGuestInput(input: unknown): UpdateGuestInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.guestId || typeof obj.guestId !== 'string') {
    throw new ValidationError('invalid_guest_id', 'guestId must be a non-empty string.');
  }

  const fields = validateGuestFields(obj);

  return { guestId: obj.guestId, ...fields };
}

/**
 * Updates a guest after verifying the caller has a management role (owner
 * or planner) for the guest's *stored* event — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event. `id`,
 * `eventId`, `createdBy`, and `createdAt` are carried over from the existing
 * document regardless of what the client sends.
 *
 * @throws ValidationError('guest_not_found') if the guest does not exist
 */
export async function updateGuest(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateGuestInput
): Promise<UpdateGuestOutput> {
  const guestRef = db.collection('guests').doc(input.guestId);
  const snapshot = await guestRef.get();
  const existing = snapshot.data() as ExistingGuestData | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('guest_not_found', 'Guest not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);

  const now = new Date().toISOString();
  await guestRef.set(
    buildGuestDocument(
      input.guestId,
      existing.eventId,
      existing.createdBy ?? auth.uid,
      input,
      existing.createdAt ?? now,
      now
    )
  );

  return { guestId: input.guestId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateGuest(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateGuestOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateGuestInput(data);
  return updateGuest(db, { uid: context.auth.uid }, input);
}
