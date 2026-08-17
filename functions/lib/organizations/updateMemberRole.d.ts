import { CallableAuthContext } from '../shared/callableContext';
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
export declare function validateUpdateOrganizationMemberRoleInput(input: unknown): UpdateOrganizationMemberRoleInput;
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
export declare function updateOrganizationMemberRole(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateOrganizationMemberRoleInput): Promise<UpdateOrganizationMemberRoleOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
export declare function handleUpdateOrganizationMemberRole(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateOrganizationMemberRoleOutput>;
export {};
