import { CallableAuthContext, buildEventMemberDocument, getEventMembershipId, validateEventCreationFields } from './shared';
export type CreateIndividualEventInput = ReturnType<typeof validateEventCreationFields>;
export interface CreateIndividualEventOutput {
    eventId: string;
    membershipId: string;
}
interface AuthContext {
    uid: string;
}
export { getEventMembershipId, buildEventMemberDocument };
/**
 * Validate the input for createIndividualEvent.
 * Throws ValidationError if any field is invalid.
 */
export declare function validateCreateIndividualEventInput(input: unknown): CreateIndividualEventInput;
/**
 * Build a Firestore event document for an individual event.
 *
 * organizationId is always null — this is what makes the event individual.
 */
export declare function buildEventDocument(eventId: string, userId: string, input: CreateIndividualEventInput, now: string): Record<string, unknown>;
/**
 * Atomically create an individual event and its owner membership.
 *
 * @param db Firestore database instance (from Admin SDK)
 * @param auth Authentication context with uid
 * @param input Validated input payload
 * @returns Created event ID and membership ID
 *
 * @throws Error if Firestore transaction fails
 */
export declare function createIndividualEvent(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateIndividualEventInput): Promise<CreateIndividualEventOutput>;
/**
 * Callable-function orchestration: authenticate, validate, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK. Reused
 * by both the onboarding individual-event step and the post-onboarding
 * "Create Event" flow — there is only one way to create an individual event.
 */
export declare function handleCreateIndividualEvent(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateIndividualEventOutput>;
