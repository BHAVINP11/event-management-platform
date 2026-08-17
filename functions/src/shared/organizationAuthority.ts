import { ValidationError } from '../validation';
import { getOrganizationMembershipId } from './membershipIds';

/**
 * Organization roles expected to manage the organization itself (settings,
 * member list, invitations) — a narrower tier than
 * `ALLOWED_ORGANIZATION_EVENT_CREATION_ROLES` in
 * `functions/src/events/createOrganizationEvent.ts`, which additionally
 * allows `planner`. Event creation and organization governance are
 * deliberately different authority tiers.
 */
const ORGANIZATION_MANAGEMENT_ROLES = ['owner', 'admin'];

/** The caller's own active membership for an organization. */
export interface ActiveOrganizationMembership {
  role: string;
}

/**
 * Loads the caller's active organization membership, by its deterministic
 * ID rather than trusting anything the client asserted about its own
 * access. The building block both `verifyOrganizationManagementAuthority`
 * (owner/admin only) and `createOrganizationEvent`'s broader
 * event-creation check (owner/admin/planner) are built from.
 *
 * @throws ValidationError('organization_not_found') if the organization does not exist
 * @throws ValidationError('organization_access_denied') if there is no active membership
 */
export async function loadActiveOrganizationMembership(
  db: FirebaseFirestore.Firestore,
  organizationId: string,
  userId: string
): Promise<ActiveOrganizationMembership> {
  const organizationSnapshot = await db.collection('organizations').doc(organizationId).get();
  if (!organizationSnapshot.exists) {
    throw new ValidationError('organization_not_found', 'Organization not found.');
  }

  const membershipId = getOrganizationMembershipId(organizationId, userId);
  const membershipSnapshot = await db.collection('organizationMembers').doc(membershipId).get();
  const membership = membershipSnapshot.data() as
    | { organizationId?: string; status?: string; role?: string }
    | undefined;

  // The deterministic ID already ties the membership document to this
  // organization; the field is checked too rather than trusted implicitly,
  // matching how firestore.rules independently verifies the same field.
  if (
    !membershipSnapshot.exists ||
    !membership ||
    membership.organizationId !== organizationId ||
    membership.status !== 'active'
  ) {
    throw new ValidationError('organization_access_denied', 'You do not have access to this organization.');
  }

  return { role: membership.role ?? '' };
}

/**
 * Verifies the caller has an active organization membership with a
 * management role (owner or admin) for the given organization.
 *
 * @throws ValidationError('organization_not_found') if the organization does not exist
 * @throws ValidationError('organization_access_denied') if there is no active membership
 * @throws ValidationError('organization_role_not_allowed') if the role cannot manage the organization
 */
export async function verifyOrganizationManagementAuthority(
  db: FirebaseFirestore.Firestore,
  organizationId: string,
  userId: string
): Promise<void> {
  const membership = await loadActiveOrganizationMembership(db, organizationId, userId);

  if (!membership.role || !ORGANIZATION_MANAGEMENT_ROLES.includes(membership.role)) {
    throw new ValidationError(
      'organization_role_not_allowed',
      'Your role does not allow managing this organization.'
    );
  }
}
