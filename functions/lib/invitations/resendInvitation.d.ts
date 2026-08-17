import { CallableAuthContext } from '../shared/callableContext';
export interface ResendInvitationInput {
    invitationId: string;
}
export interface ResendInvitationOutput {
    invitationId: string;
    expiresAt: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateResendInvitationInput(input: unknown): ResendInvitationInput;
/**
 * "Resends" a pending invitation by extending its `expiresAt` another
 * `INVITATION_EXPIRY_DAYS` from now, on the same document — there is no
 * email-sending infrastructure anywhere in this codebase, so resend
 * cannot dispatch a new email; this keeps the invitation link (and its
 * ID) valid rather than fabricating one. It intentionally works even
 * when the invitation has already passed its old `expiresAt` (the
 * invitee never accepted in time) — extending it is exactly what makes
 * that link acceptable again. A `cancelled` or already `accepted`
 * invitation cannot be resent. Authority is verified against the
 * invitation's *stored* eventId, exactly like `cancelInvitation`.
 */
export declare function resendInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: ResendInvitationInput): Promise<ResendInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * resend.
 */
export declare function handleResendInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<ResendInvitationOutput>;
export {};
