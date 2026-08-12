export interface CreateIndividualEventInput {
    name: string;
    type: string;
    description?: string;
    startDate: string;
    endDate?: string;
    timezone: string;
    venueName?: string;
    venueAddress?: string;
}
export interface CreateIndividualEventOutput {
    eventId: string;
    membershipId: string;
}
interface AuthContext {
    uid: string;
}
/**
 * Helper to create the event membership ID (deterministic).
 */
export declare function getEventMembershipId(eventId: string, userId: string): string;
/**
 * Validate the input for createIndividualEvent.
 * Throws ValidationError if any field is invalid.
 */
export declare function validateCreateIndividualEventInput(input: unknown): CreateIndividualEventInput;
/**
 * Build a Firestore event document.
 *
 * - organizationId is null (individual event)
 * - createdBy is the authenticated user
 * - status is draft
 */
export declare function buildEventDocument(eventId: string, userId: string, input: CreateIndividualEventInput, now: string): Record<string, unknown>;
/**
 * Build a Firestore event member document.
 *
 * - role is owner
 * - status is active
 * - invitedBy is null (creator, not invited)
 */
export declare function buildEventMemberDocument(membershipId: string, eventId: string, userId: string, now: string): Record<string, unknown>;
/**
 * Atomically create an event and its owner membership.
 *
 * @param db Firestore database instance (from Admin SDK)
 * @param auth Authentication context with uid
 * @param input Validated input payload
 * @returns Created event ID and membership ID
 *
 * @throws Error if Firestore transaction fails
 */
export declare function createIndividualEvent(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateIndividualEventInput): Promise<CreateIndividualEventOutput>;
export {};
