import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { assertOrganizationInvitationBelongsToCaller, loadAcceptableOrganizationInvitation } from './acceptOrganizationInvitation';

export interface GetOrganizationInvitationPreviewInput {
  invitationId: string;
}

export interface GetOrganizationInvitationPreviewOutput {
  organizationName: string;
  invitedEmail: string;
  role: string;
}

interface AuthContext {
  email?: string;
}

/**
 * Read-only projection for the `/organization-invitations/:invitationId`
 * acceptance page. The invitee cannot read `organizations/{organizationId}`
 * directly — Firestore rules only grant that to active organization
 * members, and accepting is exactly what makes them one. Rather than
 * widen that read rule (which would expose the full organization
 * document to anyone with an invitation link), this callable returns
 * only the organization name, gated by the same email-match check
 * `acceptOrganizationInvitation` uses — mirrors `functions/src/
 * invitations/getInvitationPreview.ts` exactly.
 */
export function validateGetOrganizationInvitationPreviewInput(
  input: unknown
): GetOrganizationInvitationPreviewInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.invitationId || typeof obj.invitationId !== 'string') {
    throw new ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
  }

  return { invitationId: obj.invitationId };
}

export async function getOrganizationInvitationPreview(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: GetOrganizationInvitationPreviewInput
): Promise<GetOrganizationInvitationPreviewOutput> {
  const { data: invitation } = await loadAcceptableOrganizationInvitation(db, input.invitationId);
  assertOrganizationInvitationBelongsToCaller(invitation.invitedEmail, auth.email);

  const organizationSnapshot = await db.collection('organizations').doc(invitation.organizationId).get();
  const organization = organizationSnapshot.data() as { name?: string } | undefined;

  if (!organizationSnapshot.exists || !organization?.name) {
    throw new ValidationError('invitation_not_found', 'Invitation not found.');
  }

  return {
    organizationName: organization.name,
    invitedEmail: invitation.invitedEmail,
    role: invitation.role
  };
}

/**
 * Callable-function orchestration: authenticate, validate, load.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleGetOrganizationInvitationPreview(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<GetOrganizationInvitationPreviewOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateGetOrganizationInvitationPreviewInput(data);
  return getOrganizationInvitationPreview(db, { email: context.auth.token?.email }, input);
}
