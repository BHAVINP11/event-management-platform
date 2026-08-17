import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { INVITATION_EXPIRY_DAYS } from './createInvitation';

export interface ResendInvitationInput {
  invitationId: string;
}

export interface ResendInvitationOutput {
  invitationId: string;
  expiresAt: string;
}

interface AuthContext {
  uid: string;
}

interface InvitationData {
  eventId?: string;
  status?: string;
}

export function validateResendInvitationInput(input: unknown): ResendInvitationInput {
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
 * "Resends" a pending invitation by extending its `expiresAt` another
 * `INVITATION_EXPIRY_DAYS` from now, on the same document — there is no
 * email-sending infrastructure anywhere in this codebase, so resend
 * cannot dispatch a new email; this keeps the invitation link (and its
 * ID) valid rather than fabricating one. It intentionally works even
 * when the invitation has already passed its old `expiresAt` (the
 * invitee never accepted in time) — extending it is exactly what makes
 * that link acceptable again. A `cancelled` or already `accepted`
 * invitation cannot be resent. Authority is verified against the
 * invitation's *stored* eventId, exactly like `cancelInvitation`.
 */
export async function resendInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: ResendInvitationInput
): Promise<ResendInvitationOutput> {
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

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await invitationRef.update({ expiresAt, updatedAt: now.toISOString() });

  return { invitationId: input.invitationId, expiresAt };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * resend.
 */
export async function handleResendInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<ResendInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateResendInvitationInput(data);
  return resendInvitation(db, { uid: context.auth.uid }, input);
}
