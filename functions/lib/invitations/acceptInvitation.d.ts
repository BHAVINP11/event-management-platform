import { CallableAuthContext } from '../shared/callableContext';
export interface AcceptInvitationInput {
    invitationId: string;
}
export interface AcceptInvitationOutput {
    eventId: string;
    membershipId: string;
}
interface AuthContext {
    uid: string;
    email?: string;
}
interface InvitationData {
    eventId?: string;
    invitedEmail?: string;
    role?: string;
    side?: string | null;
    status?: string;
    invitedBy?: string;
    expiresAt?: string;
}
export declare function validateAcceptInvitationInput(input: unknown): AcceptInvitationInput;
/**
 * Loads an invitation and checks it is acceptable: exists, pending, not
 * expired. Shared by acceptInvitation and getInvitationPreview so the two
 * can never disagree about what "acceptable" means.
 *
 * @throws ValidationError('invitation_not_found')
 * @throws ValidationError('invitation_not_pending')
 * @throws ValidationError('invitation_expired')
 */
export declare function loadAcceptableInvitation(db: FirebaseFirestore.Firestore, invitationId: string): Promise<{
    ref: FirebaseFirestore.DocumentReference;
    data: Required<Pick<InvitationData, 'eventId' | 'invitedEmail' | 'role'>> & InvitationData;
}>;
/**
 * Verifies the authenticated caller is the person the invitation was sent
 * to. Comparison is case-insensitive since the invited email was normalized
 * to lowercase at creation time.
 *
 * @throws ValidationError('invitation_email_mismatch')
 */
export declare function assertInvitationBelongsToCaller(invitedEmail: string, callerEmail: string | undefined): void;
/**
 * Accepts an invitation: verifies it, creates the deterministic EventMember
 * (or reactivates one belonging to the same event+user), and marks the
 * invitation accepted — atomically.
 *
 * If an active membership already exists for this event+user (e.g. a race
 * between two acceptances of the same invitation), it is left untouched
 * rather than overwritten; only the invitation is marked accepted.
 */
export declare function acceptInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: AcceptInvitationInput): Promise<AcceptInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, accept.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleAcceptInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<AcceptInvitationOutput>;
export {};
