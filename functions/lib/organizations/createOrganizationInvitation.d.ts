import { CallableAuthContext } from '../shared/callableContext';
import { CreateOrganizationInvitationFields } from './shared';
export interface CreateOrganizationInvitationInput extends CreateOrganizationInvitationFields {
    organizationId: string;
}
export interface CreateOrganizationInvitationOutput {
    invitationId: string;
}
interface AuthContext {
    uid: string;
}
/**
 * How long a new organization invitation remains acceptable. Not
 * client-configurable. A separate constant from
 * `functions/src/invitations/createInvitation.ts`'s
 * `INVITATION_EXPIRY_DAYS` — organization and event invitations are
 * deliberately independent lifecycles, even though the value happens to
 * match today.
 */
export declare const ORGANIZATION_INVITATION_EXPIRY_DAYS = 14;
export declare function validateCreateOrganizationInvitationInput(input: unknown): CreateOrganizationInvitationInput;
/**
 * Rejects a second pending invitation for the same organization + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
export declare function assertNoDuplicatePendingOrganizationInvitation(db: FirebaseFirestore.Firestore, organizationId: string, invitedEmail: string): Promise<void>;
/**
 * Creates a pending organization invitation after verifying the caller's
 * authority over the organization and that no duplicate pending
 * invitation already exists.
 *
 * Does not create an OrganizationMember — that only happens on
 * acceptance, matching the event-invitation domain exactly.
 */
export declare function createOrganizationInvitation(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateOrganizationInvitationInput): Promise<CreateOrganizationInvitationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateOrganizationInvitation(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateOrganizationInvitationOutput>;
export {};
