import { CallableAuthContext } from '../shared/callableContext';
export interface ResendOrganizationInvitationInput {
    invitationId: string;
}
export interface ResendOrganizationInvitationOutput {
    invitationId: string;
    expiresAt: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateResendOrganizationInvitationInput(input: unknown): ResendOrganizationInvitationInput;
/**
 * "Resends" a pending organization invitation by extending its
 * `expiresAt` another `ORGANIZATION_INVITATION_EXPIRY_DAYS` from now, on
 * the same document — there is no email-sending infrastructure anywhere
 * in this codebase, so resend cannot dispatch a new email; this keeps
 * the invitation link (and its ID) valid rather than fabricating one,
 * mirroring `functions/src/invitations/resendInvitation.ts` exactly. It
 * intentionally works even when the invitation has already passed its
 * old `expiresAt`. A `cancelled` or already `accepted` invitation cannot
 * be resent. Authority is verified against the invitation's *stored*
 * organizationId, exactly like `cancelOrganizationInvitation`.
 */
export declare function resendOrganizationInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: ResendOrganizationInvitationInput): Promise<ResendOrganizationInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * resend.
 */
export declare function handleResendOrganizationInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<ResendOrganizationInvitationOutput>;
export {};
