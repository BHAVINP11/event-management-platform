import { CallableAuthContext, EventCreationFields } from './shared';
export interface CreateOrganizationEventInput extends EventCreationFields {
    organizationId: string;
}
export interface CreateOrganizationEventOutput {
    eventId: string;
    membershipId: string;
}
interface AuthContext {
    uid: string;
}
/**
 * Validate the input for createOrganizationEvent.
 * Throws ValidationError if any field is invalid.
 */
export declare function validateCreateOrganizationEventInput(input: unknown): CreateOrganizationEventInput;
/**
 * Verifies the caller may create events for the given organization.
 *
 * Loads the membership via the shared `loadActiveOrganizationMembership`
 * (by its deterministic ID, never trusting anything the client asserted
 * about its own access, and never trusting a role or status passed from
 * the browser — only the stored membership document), then applies this
 * function's own, broader role list — event creation additionally allows
 * `planner`, unlike organization management (settings/members), which
 * does not.
 *
 * @throws ValidationError('organization_not_found') if the organization does not exist
 * @throws ValidationError('organization_access_denied') if there is no active membership
 * @throws ValidationError('organization_role_not_allowed') if the role cannot create events
 */
export declare function verifyOrganizationEventCreationAccess(db: FirebaseFirestore.Firestore, organizationId: string, userId: string): Promise<void>;
/**
 * Atomically create an organization event and its owner membership, after
 * verifying the caller has an active, event-creation-capable membership in
 * that organization.
 *
 * @throws ValidationError if the caller lacks organization access
 * @throws Error if the Firestore transaction fails
 */
export declare function createOrganizationEvent(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateOrganizationEventInput): Promise<CreateOrganizationEventOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateOrganizationEvent(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateOrganizationEventOutput>;
export {};
