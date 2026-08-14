import { CallableAuthContext } from '../shared/callableContext';
export interface GetInvitationPreviewInput {
    invitationId: string;
}
export interface GetInvitationPreviewOutput {
    eventName: string;
    invitedEmail: string;
    role: string;
    side: string | null;
}
interface AuthContext {
    email?: string;
}
/**
 * Read-only projection for the `/invitations/:invitationId` acceptance page.
 *
 * The invitee cannot read `events/{eventId}` directly — Firestore rules only
 * grant that to active event members, and accepting is exactly what makes
 * them one. Rather than widen that read rule (which would expose the full
 * event document — venue, dates, description — to anyone with an invitation
 * link), this callable returns only the event name, gated by the same
 * email-match check `acceptInvitation` uses. "Do not grant access before
 * acceptance" applies to more than just the EventMember write.
 */
export declare function validateGetInvitationPreviewInput(input: unknown): GetInvitationPreviewInput;
export declare function getInvitationPreview(db: FirebaseFirestore.Firestore, auth: AuthContext, input: GetInvitationPreviewInput): Promise<GetInvitationPreviewOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleGetInvitationPreview(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<GetInvitationPreviewOutput>;
export {};
