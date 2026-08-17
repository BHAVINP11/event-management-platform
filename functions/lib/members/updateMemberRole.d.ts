import { CallableAuthContext } from '../shared/callableContext';
export interface UpdateMemberRoleInput {
    eventId: string;
    userId: string;
    role: string;
    side?: string;
}
export interface UpdateMemberRoleOutput {
    eventId: string;
    userId: string;
    role: string;
    side: string | null;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateMemberRoleInput(input: unknown): UpdateMemberRoleInput;
/**
 * Changes a member's role and/or side. The caller must have an active
 * EventMember with role owner or planner. Reuses the exact role/side
 * vocabulary and validation `createInvitation` already established
 * (`INVITABLE_EVENT_ROLES` excludes `owner`, so a member can never be
 * promoted *to* owner this way, and `validateInvitationSide` already
 * rejects a side on a role that doesn't allow one) rather than
 * duplicating it. The event owner's own role can never be changed here —
 * ownership transfer is a separate, larger decision this pass
 * deliberately does not implement.
 */
export declare function updateMemberRole(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateMemberRoleInput): Promise<UpdateMemberRoleOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
export declare function handleUpdateMemberRole(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateMemberRoleOutput>;
export {};
