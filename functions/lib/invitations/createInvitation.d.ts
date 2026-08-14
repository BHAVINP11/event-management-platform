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
