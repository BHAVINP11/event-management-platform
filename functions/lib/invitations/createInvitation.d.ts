import { CallableAuthContext } from '../shared/callableContext';
import { CreateInvitationFields } from './shared';
export interface CreateInvitationInput extends CreateInvitationFields {
    eventId: string;
}
export interface CreateInvitationOutput {
    invitationId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCreateInvitationInput(input: unknown): CreateInvitationInput;
/**
 * Verifies the caller may invite people to the given event.
 *
 * Loads the membership by its deterministic ID rather than trusting anything
 * the client asserted about its own access — mirrors
 * `verifyOrganizationEventCreationAccess` in
 * `functions/src/events/createOrganizationEvent.ts`.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 * @throws ValidationError('event_access_denied') if there is no active membership
 * @throws ValidationError('event_role_not_allowed') if the role cannot invite
 */
export declare function verifyInviterAuthority(db: FirebaseFirestore.Firestore, eventId: string, userId: string): Promise<void>;
/**
 * Rejects a second pending invitation for the same event + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
export declare function assertNoDuplicatePendingInvitation(db: FirebaseFirestore.Firestore, eventId: string, invitedEmail: string): Promise<void>;
/**
 * Creates a pending invitation after verifying the caller's authority over
 * the event and that no duplicate pending invitation already exists.
 *
 * Does not create an EventMember — that only happens on acceptance.
 */
export declare function createInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateInvitationInput): Promise<CreateInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateInvitationOutput>;
export {};
