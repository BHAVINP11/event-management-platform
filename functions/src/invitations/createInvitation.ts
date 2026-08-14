import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { CreateInvitationFields, buildInvitationDocument, validateInvitationFields } from './shared';

export interface CreateInvitationInput extends CreateInvitationFields {
  eventId: string;
}

export interface CreateInvitationOutput {
  invitationId: string;
}

interface AuthContext {
  uid: string;
}

/** How long a new invitation remains acceptable. Not client-configurable. */
const INVITATION_EXPIRY_DAYS = 14;

export function validateCreateInvitationInput(input: unknown): CreateInvitationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateInvitationFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Rejects a second pending invitation for the same event + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
export async function assertNoDuplicatePendingInvitation(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  invitedEmail: string
): Promise<void> {
  const snapshot = await db
    .collection('invitations')
    .where('eventId', '==', eventId)
    .where('invitedEmail', '==', invitedEmail)
    .where('status', '==', 'pending')
    .get();

  if (!snapshot.empty) {
    throw new ValidationError(
      'invitation_already_pending',
      'There is already a pending invitation for this email.'
    );
  }
}

/**
 * Creates a pending invitation after verifying the caller's authority over
 * the event and that no duplicate pending invitation already exists.
 *
 * Does not create an EventMember — that only happens on acceptance.
 */
export async function createInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateInvitationInput
): Promise<CreateInvitationOutput> {
  const userId = auth.uid;

  await verifyEventManagementAuthority(db, input.eventId, userId);
  await assertNoDuplicatePendingInvitation(db, input.eventId, input.invitedEmail);

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const invitationRef = db.collection('invitations').doc();
  const invitationId = invitationRef.id;

  await invitationRef.set(buildInvitationDocument(invitationId, input.eventId, userId, input, nowIso, expiresAt));

  return { invitationId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateInvitationInput(data);
  return createInvitation(db, { uid: context.auth.uid }, input);
}
