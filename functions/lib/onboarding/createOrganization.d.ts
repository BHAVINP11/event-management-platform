import { getOrganizationMembershipId } from '../shared/membershipIds';
export interface CreateOrganizationInput {
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
}
export interface CreateOrganizationOutput {
    organizationId: string;
    membershipId: string;
}
interface AuthContext {
    uid: string;
}
export { getOrganizationMembershipId };
/**
 * Validate the input for createOrganization.
 * Throws ValidationError if any field is invalid.
 */
export declare function validateCreateOrganizationInput(input: unknown): CreateOrganizationInput;
/**
 * Build a Firestore organization document.
 * Optional fields are omitted when not provided (not stored as undefined).
 */
export declare function buildOrganizationDocument(organizationId: string, input: CreateOrganizationInput, now: string): Record<string, unknown>;
/**
 * Build a Firestore organization member document.
 */
export declare function buildOrganizationMemberDocument(membershipId: string, organizationId: string, userId: string, now: string): Record<string, unknown>;
/**
 * Check if an organization slug already exists.
 *
 * Query organizations by slug and return true if any match.
 * This is a simple linear search; for production, consider
 * a dedicated slug index or hash.
 */
export declare function isSlugTaken(db: FirebaseFirestore.Firestore, slug: string): Promise<boolean>;
/**
 * Atomically create an organization and its owner membership.
 *
 * @param db Firestore database instance (from Admin SDK)
 * @param auth Authentication context with uid
 * @param input Validated input payload
 * @returns Created organization ID and membership ID
 *
 * @throws ValidationError if slug is already taken
 * @throws Error if Firestore transaction fails
 */
export declare function createOrganization(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateOrganizationInput): Promise<CreateOrganizationOutput>;
