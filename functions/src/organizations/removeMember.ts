import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyOrganizationManagementAuthority } from '../shared/organizationAuthority';
import { getOrganizationMembershipId } from '../shared/membershipIds';

export interface RemoveOrganizationMemberInput {
  organizationId: string;
  userId: string;
}

export interface RemoveOrganizationMemberOutput {
  organizationId: string;
  userId: string;
}

interface AuthContext {
  uid: string;
}

interface OrganizationMemberData {
  role?: string;
  status?: string;
}

export function validateRemoveOrganizationMemberInput(input: unknown): RemoveOrganizationMemberInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.organizationId || typeof obj.organizationId !== 'string') {
    throw new ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
  }
  if (!obj.userId || typeof obj.userId !== 'string') {
    throw new ValidationError('invalid_user_id', 'userId must be a non-empty string.');
  }

  return { organizationId: obj.organizationId, userId: obj.userId };
}

/**
 * Removes a member from an organization. The caller must have an active
 * OrganizationMember with role owner or admin. Removal marks the
 * membership `revoked` rather than deleting the document — mirroring
 * `functions/src/members/removeMember.ts`'s event-domain approach exactly
 * — Firestore rules already require `status == 'active'` for every
 * organization-scoped read, so revocation alone instantly and completely
 * removes the member's access with no rule changes, and preserves the
 * document instead of orphaning it.
 *
 * This has no effect on any event: event access is governed solely by
 * `eventMembers` documents, which are entirely independent of
 * organization membership (confirmed by inspection — there is no
 * cascading relationship anywhere in this codebase). Removing an
 * organization member does not delete their Firebase Auth account, their
 * personal data, their event memberships, or events they created.
 *
 * The organization owner can never be removed this way — there is
 * exactly one owner (the creator; `INVITABLE_ORGANIZATION_ROLES`
 * excludes `owner`, so nobody can ever be invited/promoted to it), and
 * ownership transfer is a separate, larger decision this pass
 * deliberately does not implement. Since the owner can never be removed
 * or demoted, the organization can never be left without a manager —
 * satisfying "never leave the organization without an owner/admin"
 * without inventing additional last-admin-counting logic that has no
 * precedent anywhere else in this codebase.
 */
export async function removeOrganizationMember(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: RemoveOrganizationMemberInput
): Promise<RemoveOrganizationMemberOutput> {
  await verifyOrganizationManagementAuthority(db, input.organizationId, auth.uid);

  const membershipId = getOrganizationMembershipId(input.organizationId, input.userId);
  const membershipRef = db.collection('organizationMembers').doc(membershipId);
  const snapshot = await membershipRef.get();
  const existing = snapshot.data() as OrganizationMemberData | undefined;

  if (!snapshot.exists || !existing) {
    throw new ValidationError('organization_member_not_found', 'This member could not be found.');
  }

  if (existing.role === 'owner') {
    throw new ValidationError('organization_owner_cannot_be_removed', 'The organization owner cannot be removed.');
  }

  const now = new Date().toISOString();
  await membershipRef.update({ status: 'revoked', updatedAt: now });

  return { organizationId: input.organizationId, userId: input.userId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * remove.
 */
export async function handleRemoveOrganizationMember(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<RemoveOrganizationMemberOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateRemoveOrganizationMemberInput(data);
  return removeOrganizationMember(db, { uid: context.auth.uid }, input);
}
