import { CallableAuthContext } from '../shared/callableContext';
export interface GetOrganizationInvitationPreviewInput {
    invitationId: string;
}
export interface GetOrganizationInvitationPreviewOutput {
    organizationName: string;
    invitedEmail: string;
    role: string;
}
interface AuthContext {
    email?: string;
}
/**
 * Read-only projection for the `/organization-invitations/:invitationId`
 * acceptance page. The invitee cannot read `organizations/{organizationId}`
 * directly — Firestore rules only grant that to active organization
 * members, and accepting is exactly what makes them one. Rather than
 * widen that read rule (which would expose the full organization
 * document to anyone with an invitation link), this callable returns
 * only the organization name, gated by the same email-match check
 * `acceptOrganizationInvitation` uses — mirrors `functions/src/
 * invitations/getInvitationPreview.ts` exactly.
 */
export declare function validateGetOrganizationInvitationPreviewInput(input: unknown): GetOrganizationInvitationPreviewInput;
export declare function getOrganizationInvitationPreview(db: FirebaseFirestore.Firestore, auth: AuthContext, input: GetOrganizationInvitationPreviewInput): Promise<GetOrganizationInvitationPreviewOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleGetOrganizationInvitationPreview(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<GetOrganizationInvitationPreviewOutput>;
export {};
