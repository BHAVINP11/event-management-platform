import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyOrganizationManagementAuthority } from '../shared/organizationAuthority';
import { getOrganizationMembershipId } from '../shared/membershipIds';
import { validateOrganizationInvitationRole } from './shared';

export interface UpdateOrganizationMemberRoleInput {
  organizationId: string;
  userId: string;
  role: string;
}

export interface UpdateOrganizationMemberRoleOutput {
  organizationId: string;
  userId: string;
  role: string;
}

interface AuthContext {
  uid: string;
}

interface OrganizationMemberData {
  role?: string;
  status?: string;
}

export function validateUpdateOrganizationMemberRoleInput(input: unknown): UpdateOrganizationMemberRoleInput {
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

  const role = validateOrganizationInvitationRole(obj.role);

  return { organizationId: obj.organizationId, userId: obj.userId, role };
}

/**
 * Changes a member's role. The caller must have an active
 * OrganizationMember with role owner or admin. Reuses the exact role
 * vocabulary `createOrganizationInvitation` already established
 * (`INVITABLE_ORGANIZATION_ROLES` excludes `owner`, so a member can never
 * be promoted *to* owner this way) rather than duplicating it. The
 * organization owner's own role can never be changed here — ownership
 * transfer is a separate, larger decision this pass deliberately does
 * not implement (see `removeOrganizationMember` for the same reasoning
 * on why this alone is sufficient to guarantee the organization always
 * keeps a manager).
 */
export async function updateOrganizationMemberRole(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateOrganizationMemberRoleInput
): Promise<UpdateOrganizationMemberRoleOutput> {
  await verifyOrganizationManagementAuthority(db, input.organizationId, auth.uid);

  const membershipId = getOrganizationMembershipId(input.organizationId, input.userId);
  const membershipRef = db.collection('organizationMembers').doc(membershipId);
  const snapshot = await membershipRef.get();
  const existing = snapshot.data() as OrganizationMemberData | undefined;

  if (!snapshot.exists || !existing) {
    throw new ValidationError('organization_member_not_found', 'This member could not be found.');
  }

  if (existing.role === 'owner') {
    throw new ValidationError(
      'organization_owner_role_immutable',
      "The organization owner's role cannot be changed."
    );
  }

  const now = new Date().toISOString();
  await membershipRef.update({ role: input.role, updatedAt: now });

  return { organizationId: input.organizationId, userId: input.userId, role: input.role };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
export async function handleUpdateOrganizationMemberRole(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateOrganizationMemberRoleOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateOrganizationMemberRoleInput(data);
  return updateOrganizationMemberRole(db, { uid: context.auth.uid }, input);
}
