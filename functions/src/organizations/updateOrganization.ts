import {
  ValidationError,
  validateContactEmail,
  validateContactPhone,
  validateOrganizationDescription,
  validateOrganizationName
} from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyOrganizationManagementAuthority } from '../shared/organizationAuthority';

export interface UpdateOrganizationInput {
  organizationId: string;
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateOrganizationOutput {
  organizationId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingOrganizationData {
  slug?: string;
  logoUrl?: string;
  createdAt?: string;
}

export function validateUpdateOrganizationInput(input: unknown): UpdateOrganizationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.organizationId || typeof obj.organizationId !== 'string') {
    throw new ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
  }

  validateOrganizationName(obj.name);
  validateOrganizationDescription(obj.description);
  validateContactEmail(obj.contactEmail);
  validateContactPhone(obj.contactPhone);

  return {
    organizationId: obj.organizationId,
    name: obj.name as string,
    description: obj.description as string | undefined,
    contactEmail: obj.contactEmail as string | undefined,
    contactPhone: obj.contactPhone as string | undefined
  };
}

/**
 * Updates an organization's name/description/contact details. The caller
 * must have an active OrganizationMember with role owner or admin. Only
 * these existing `Organization` fields are editable — no new fields are
 * introduced. `slug` and `logoUrl` are always carried over unchanged from
 * the existing document (neither has an editing story in this pass: slug
 * is a stable identifier nothing else in the codebase re-validates for
 * uniqueness on edit, and logoUrl has no upload path yet). A full
 * document `.set()` (not a partial `.update()`), matching
 * `updateEvent.ts`'s approach, so omitting `description`/`contactEmail`/
 * `contactPhone` actually clears them rather than leaving stale data.
 */
export async function updateOrganization(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateOrganizationInput
): Promise<UpdateOrganizationOutput> {
  await verifyOrganizationManagementAuthority(db, input.organizationId, auth.uid);

  const organizationRef = db.collection('organizations').doc(input.organizationId);
  const snapshot = await organizationRef.get();
  const existing = snapshot.data() as ExistingOrganizationData | undefined;

  if (!snapshot.exists || !existing) {
    throw new ValidationError('organization_not_found', 'Organization not found.');
  }

  const now = new Date().toISOString();

  const doc: Record<string, unknown> = {
    id: input.organizationId,
    name: input.name,
    slug: existing.slug,
    createdAt: existing.createdAt,
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
  if (existing.logoUrl !== undefined) {
    doc.logoUrl = existing.logoUrl;
  }

  await organizationRef.set(doc);

  return { organizationId: input.organizationId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
export async function handleUpdateOrganization(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateOrganizationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateOrganizationInput(data);
  return updateOrganization(db, { uid: context.auth.uid }, input);
}
