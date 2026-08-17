import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyOrganizationManagementAuthority } from '../shared/organizationAuthority';
import {
  CreateOrganizationInvitationFields,
  buildOrganizationInvitationDocument,
  validateOrganizationInvitationFields
} from './shared';

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
export const ORGANIZATION_INVITATION_EXPIRY_DAYS = 14;

export function validateCreateOrganizationInvitationInput(input: unknown): CreateOrganizationInvitationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.organizationId || typeof obj.organizationId !== 'string') {
    throw new ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
  }

  const fields = validateOrganizationInvitationFields(obj);

  return { organizationId: obj.organizationId, ...fields };
}

/**
 * Rejects a second pending invitation for the same organization + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
export async function assertNoDuplicatePendingOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  organizationId: string,
  invitedEmail: string
): Promise<void> {
  const snapshot = await db
    .collection('organizationInvitations')
    .where('organizationId', '==', organizationId)
    .where('invitedEmail', '==', invitedEmail)
    .where('status', '==', 'pending')
    .get();

  if (!snapshot.empty) {
    throw new ValidationError(
      'invitation_already_pending',
      'There is already a pending invitation for this email.'
    );
  }
}

/**
 * Creates a pending organization invitation after verifying the caller's
 * authority over the organization and that no duplicate pending
 * invitation already exists.
 *
 * Does not create an OrganizationMember — that only happens on
 * acceptance, matching the event-invitation domain exactly.
 */
export async function createOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateOrganizationInvitationInput
): Promise<CreateOrganizationInvitationOutput> {
  const userId = auth.uid;

  await verifyOrganizationManagementAuthority(db, input.organizationId, userId);
  await assertNoDuplicatePendingOrganizationInvitation(db, input.organizationId, input.invitedEmail);

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + ORGANIZATION_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const invitationRef = db.collection('organizationInvitations').doc();
  const invitationId = invitationRef.id;

  await invitationRef.set(
    buildOrganizationInvitationDocument(invitationId, input.organizationId, userId, input, nowIso, expiresAt)
  );

  return { invitationId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateOrganizationInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateOrganizationInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateOrganizationInvitationInput(data);
  return createOrganizationInvitation(db, { uid: context.auth.uid }, input);
}
