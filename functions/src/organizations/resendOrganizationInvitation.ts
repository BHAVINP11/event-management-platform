import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyOrganizationManagementAuthority } from '../shared/organizationAuthority';
import { ORGANIZATION_INVITATION_EXPIRY_DAYS } from './createOrganizationInvitation';

export interface ResendOrganizationInvitationInput {
  invitationId: string;
}

export interface ResendOrganizationInvitationOutput {
  invitationId: string;
  expiresAt: string;
}

interface AuthContext {
  uid: string;
}

interface OrganizationInvitationData {
  organizationId?: string;
  status?: string;
}

export function validateResendOrganizationInvitationInput(input: unknown): ResendOrganizationInvitationInput {
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
 * "Resends" a pending organization invitation by extending its
 * `expiresAt` another `ORGANIZATION_INVITATION_EXPIRY_DAYS` from now, on
 * the same document — there is no email-sending infrastructure anywhere
 * in this codebase, so resend cannot dispatch a new email; this keeps
 * the invitation link (and its ID) valid rather than fabricating one,
 * mirroring `functions/src/invitations/resendInvitation.ts` exactly. It
 * intentionally works even when the invitation has already passed its
 * old `expiresAt`. A `cancelled` or already `accepted` invitation cannot
 * be resent. Authority is verified against the invitation's *stored*
 * organizationId, exactly like `cancelOrganizationInvitation`.
 */
export async function resendOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: ResendOrganizationInvitationInput
): Promise<ResendOrganizationInvitationOutput> {
  const invitationRef = db.collection('organizationInvitations').doc(input.invitationId);
  const snapshot = await invitationRef.get();
  const invitation = snapshot.data() as OrganizationInvitationData | undefined;

  if (!snapshot.exists || !invitation || !invitation.organizationId) {
    throw new ValidationError('invitation_not_found', 'Invitation not found.');
  }

  await verifyOrganizationManagementAuthority(db, invitation.organizationId, auth.uid);

  if (invitation.status !== 'pending') {
    throw new ValidationError('invitation_not_pending', 'This invitation is no longer pending.');
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + ORGANIZATION_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  await invitationRef.update({ expiresAt, updatedAt: now.toISOString() });

  return { invitationId: input.invitationId, expiresAt };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * resend.
 */
export async function handleResendOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<ResendOrganizationInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateResendOrganizationInvitationInput(data);
  return resendOrganizationInvitation(db, { uid: context.auth.uid }, input);
}
