import { CallableAuthContext } from '../shared/callableContext';
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
export declare function validateRemoveOrganizationMemberInput(input: unknown): RemoveOrganizationMemberInput;
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
export declare function removeOrganizationMember(db: FirebaseFirestore.Firestore, auth: AuthContext, input: RemoveOrganizationMemberInput): Promise<RemoveOrganizationMemberOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * remove.
 */
export declare function handleRemoveOrganizationMember(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<RemoveOrganizationMemberOutput>;
export {};
