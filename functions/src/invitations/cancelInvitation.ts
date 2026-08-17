import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

export interface CancelInvitationInput {
  invitationId: string;
}

export interface CancelInvitationOutput {
  invitationId: string;
}

interface AuthContext {
  uid: string;
}

interface InvitationData {
  eventId?: string;
  status?: string;
}

export function validateCancelInvitationInput(input: unknown): CancelInvitationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.invitationId || typeof obj.invitationId !== 'string') {
    throw new ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
  }

  return { invitationId: obj.invitationId };
}

/**
 * Cancels a pending invitation. Authority is verified against the
 * invitation's *stored* eventId, never one the client could supply, so a
 * client cannot retarget a cancellation at a different event's
 * invitation. Only a `pending` invitation can be cancelled — an already
 * accepted membership, or an already cancelled/expired invitation, is
 * left untouched.
 */
export async function cancelInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CancelInvitationInput
): Promise<CancelInvitationOutput> {
  const invitationRef = db.collection('invitations').doc(input.invitationId);
  const snapshot = await invitationRef.get();
  const invitation = snapshot.data() as InvitationData | undefined;

  if (!snapshot.exists || !invitation || !invitation.eventId) {
    throw new ValidationError('invitation_not_found', 'Invitation not found.');
  }

  await verifyEventManagementAuthority(db, invitation.eventId, auth.uid);

  if (invitation.status !== 'pending') {
    throw new ValidationError('invitation_not_pending', 'This invitation is no longer pending.');
  }

  const now = new Date().toISOString();
  await invitationRef.update({ status: 'cancelled', updatedAt: now });

  return { invitationId: input.invitationId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * cancel.
 */
export async function handleCancelInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CancelInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCancelInvitationInput(data);
  return cancelInvitation(db, { uid: context.auth.uid }, input);
}
