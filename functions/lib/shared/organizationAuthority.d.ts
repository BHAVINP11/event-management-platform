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
export declare function loadActiveOrganizationMembership(db: FirebaseFirestore.Firestore, organizationId: string, userId: string): Promise<ActiveOrganizationMembership>;
/**
 * Verifies the caller has an active organization membership with a
 * management role (owner or admin) for the given organization.
 *
 * @throws ValidationError('organization_not_found') if the organization does not exist
 * @throws ValidationError('organization_access_denied') if there is no active membership
 * @throws ValidationError('organization_role_not_allowed') if the role cannot manage the organization
 */
export declare function verifyOrganizationManagementAuthority(db: FirebaseFirestore.Firestore, organizationId: string, userId: string): Promise<void>;
