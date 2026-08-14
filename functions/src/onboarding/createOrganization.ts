import { DecodedIdToken } from 'firebase-admin/auth';
import {
  normalizeAndValidateSlug,
  validateOrganizationName,
  validateOrganizationDescription,
  validateContactEmail,
  validateContactPhone,
  ValidationError
} from '../validation';
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
export function validateCreateOrganizationInput(input: unknown): CreateOrganizationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  validateOrganizationName(obj.name);
  validateOrganizationDescription(obj.description);
  validateContactEmail(obj.contactEmail);
  validateContactPhone(obj.contactPhone);

  const normalizedSlug = normalizeAndValidateSlug(obj.slug as string);

  return {
    name: obj.name as string,
    slug: normalizedSlug,
    description: obj.description as string | undefined,
    contactEmail: obj.contactEmail as string | undefined,
    contactPhone: obj.contactPhone as string | undefined
  };
}

/**
 * Build a Firestore organization document.
 * Optional fields are omitted when not provided (not stored as undefined).
 */
export function buildOrganizationDocument(
  organizationId: string,
  input: CreateOrganizationInput,
  now: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: organizationId,
    name: input.name,
    slug: input.slug,
    createdAt: now,
    updatedAt: now
  };

  if (input.description !== undefined) {
    doc.description = input.description;
  }
  if (input.contactEmail !== undefined) {
    doc.contactEmail = input.contactEmail;
  }
  if (input.contactPhone !== undefined) {
    doc.contactPhone = input.contactPhone;
  }

  return doc;
}

/**
 * Build a Firestore organization member document.
 */
export function buildOrganizationMemberDocument(
  membershipId: string,
  organizationId: string,
  userId: string,
  now: string
): Record<string, unknown> {
  return {
    id: membershipId,
    organizationId,
    userId,
    role: 'owner',
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Check if an organization slug already exists.
 * 
 * Query organizations by slug and return true if any match.
 * This is a simple linear search; for production, consider
 * a dedicated slug index or hash.
 */
export async function isSlugTaken(db: FirebaseFirestore.Firestore, slug: string): Promise<boolean> {
  const snapshot = await db
    .collection('organizations')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  return !snapshot.empty;
}

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
export async function createOrganization(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateOrganizationInput
): Promise<CreateOrganizationOutput> {
  const userId = auth.uid;
  const now = new Date().toISOString();

  // Check for duplicate slug
  const slugTaken = await isSlugTaken(db, input.slug);
  if (slugTaken) {
    throw new ValidationError('organization_slug_taken', 'This organization slug is already taken.');
  }

  // Generate organization ID (Firestore will auto-generate)
  const organizationRef = db.collection('organizations').doc();
  const organizationId = organizationRef.id;

  // Build membership ID (deterministic)
  const membershipId = getOrganizationMembershipId(organizationId, userId);
  const membershipRef = db.collection('organizationMembers').doc(membershipId);

  // Execute atomically
  const batch = db.batch();

  batch.set(
    organizationRef,
    buildOrganizationDocument(organizationId, input, now)
  );

  batch.set(
    membershipRef,
    buildOrganizationMemberDocument(membershipId, organizationId, userId, now)
  );

  await batch.commit();

  return {
    organizationId,
    membershipId
  };
}
