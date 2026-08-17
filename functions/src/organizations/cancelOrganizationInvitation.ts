import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyOrganizationManagementAuthority } from '../shared/organizationAuthority';

export interface CancelOrganizationInvitationInput {
  invitationId: string;
}

export interface CancelOrganizationInvitationOutput {
  invitationId: string;
}

interface AuthContext {
  uid: string;
}

interface OrganizationInvitationData {
  organizationId?: string;
  status?: string;
}

export function validateCancelOrganizationInvitationInput(input: unknown): CancelOrganizationInvitationInput {
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
 * Cancels a pending organization invitation. Authority is verified
 * against the invitation's *stored* organizationId, never one the client
 * could supply, so a client cannot retarget a cancellation at a
 * different organization's invitation. Only a `pending` invitation can
 * be cancelled — an already accepted membership, or an already
 * cancelled/expired invitation, is left untouched. Mirrors
 * `functions/src/invitations/cancelInvitation.ts` exactly, for the
 * `organizationInvitations` collection.
 */
export async function cancelOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CancelOrganizationInvitationInput
): Promise<CancelOrganizationInvitationOutput> {
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

  const now = new Date().toISOString();
  await invitationRef.update({ status: 'cancelled', updatedAt: now });

  return { invitationId: input.invitationId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * cancel.
 */
export async function handleCancelOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CancelOrganizationInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCancelOrganizationInvitationInput(data);
  return cancelOrganizationInvitation(db, { uid: context.auth.uid }, input);
}
