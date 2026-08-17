import { CallableAuthContext } from '../shared/callableContext';
export interface CancelInvitationInput {
    invitationId: string;
}
export interface CancelInvitationOutput {
    invitationId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCancelInvitationInput(input: unknown): CancelInvitationInput;
/**
 * Cancels a pending invitation. Authority is verified against the
 * invitation's *stored* eventId, never one the client could supply, so a
 * client cannot retarget a cancellation at a different event's
 * invitation. Only a `pending` invitation can be cancelled — an already
 * accepted membership, or an already cancelled/expired invitation, is
 * left untouched.
 */
export declare function cancelInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CancelInvitationInput): Promise<CancelInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * cancel.
 */
export declare function handleCancelInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CancelInvitationOutput>;
export {};
