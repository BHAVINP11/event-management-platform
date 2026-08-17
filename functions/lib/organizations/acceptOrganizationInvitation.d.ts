import { CallableAuthContext } from '../shared/callableContext';
export interface AcceptOrganizationInvitationInput {
    invitationId: string;
}
export interface AcceptOrganizationInvitationOutput {
    organizationId: string;
    membershipId: string;
}
interface AuthContext {
    uid: string;
    email?: string;
}
interface OrganizationInvitationData {
    organizationId?: string;
    invitedEmail?: string;
    role?: string;
    status?: string;
    invitedBy?: string;
    expiresAt?: string;
}
export declare function validateAcceptOrganizationInvitationInput(input: unknown): AcceptOrganizationInvitationInput;
/**
 * Loads an organization invitation and checks it is acceptable: exists,
 * pending, not expired. Shared by acceptOrganizationInvitation and
 * getOrganizationInvitationPreview so the two can never disagree about
 * what "acceptable" means — mirrors `functions/src/invitations/
 * acceptInvitation.ts`'s `loadAcceptableInvitation` exactly, for the
 * `organizationInvitations` collection.
 *
 * @throws ValidationError('invitation_not_found')
 * @throws ValidationError('invitation_not_pending')
 * @throws ValidationError('invitation_expired')
 */
export declare function loadAcceptableOrganizationInvitation(db: FirebaseFirestore.Firestore, invitationId: string): Promise<{
    ref: FirebaseFirestore.DocumentReference;
    data: Required<Pick<OrganizationInvitationData, 'organizationId' | 'invitedEmail' | 'role'>> & OrganizationInvitationData;
}>;
/**
 * Verifies the authenticated caller is the person the invitation was sent
 * to. Comparison is case-insensitive since the invited email was
 * normalized to lowercase at creation time.
 *
 * @throws ValidationError('invitation_email_mismatch')
 */
export declare function assertOrganizationInvitationBelongsToCaller(invitedEmail: string, callerEmail: string | undefined): void;
/**
 * Accepts an organization invitation: verifies it, creates the
 * deterministic OrganizationMember (or reactivates one belonging to the
 * same organization+user), and marks the invitation accepted —
 * atomically.
 *
 * If an active membership already exists for this organization+user
 * (e.g. a race between two acceptances of the same invitation), it is
 * left untouched rather than overwritten; only the invitation is marked
 * accepted.
 */
export declare function acceptOrganizationInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: AcceptOrganizationInvitationInput): Promise<AcceptOrganizationInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, accept.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleAcceptOrganizationInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<AcceptOrganizationInvitationOutput>;
export {};
