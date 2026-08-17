import { CallableAuthContext } from '../shared/callableContext';
export interface CancelOrganizationInvitationInput {
    invitationId: string;
}
export interface CancelOrganizationInvitationOutput {
    invitationId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCancelOrganizationInvitationInput(input: unknown): CancelOrganizationInvitationInput;
/**
 * Cancels a pending organization invitation. Authority is verified
 * against the invitation's *stored* organizationId, never one the client
 * could supply, so a client cannot retarget a cancellation at a
 * different organization's invitation. Only a `pending` invitation can
 * be cancelled — an already accepted membership, or an already
 * cancelled/expired invitation, is left untouched. Mirrors
 * `functions/src/invitations/cancelInvitation.ts` exactly, for the
 * `organizationInvitations` collection.
 */
export declare function cancelOrganizationInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CancelOrganizationInvitationInput): Promise<CancelOrganizationInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * cancel.
 */
export declare function handleCancelOrganizationInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CancelOrganizationInvitationOutput>;
export {};
