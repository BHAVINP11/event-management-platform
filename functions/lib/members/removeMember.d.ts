import { CallableAuthContext } from '../shared/callableContext';
export interface RemoveMemberInput {
    eventId: string;
    userId: string;
}
export interface RemoveMemberOutput {
    eventId: string;
    userId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateRemoveMemberInput(input: unknown): RemoveMemberInput;
/**
 * Removes a member from an event. The caller must have an active
 * EventMember with role owner or planner. Removal marks the membership
 * `revoked` rather than deleting the document — Firestore rules already
 * require `status == 'active'` for every event-scoped read, so revocation
 * alone instantly and completely removes the member's access with no rule
 * changes, and preserves the document (and anything referencing the
 * user's ID, like task `assignedTo`) instead of orphaning it. The event
 * owner can never be removed this way — ownership transfer is a separate,
 * larger decision this pass deliberately does not implement.
 */
export declare function removeMember(db: FirebaseFirestore.Firestore, auth: AuthContext, input: RemoveMemberInput): Promise<RemoveMemberOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * remove.
 */
export declare function handleRemoveMember(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<RemoveMemberOutput>;
export {};
