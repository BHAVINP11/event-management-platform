/**
 * Shared building blocks for organization invitations.
 *
 * A deliberate, separate parallel to `functions/src/invitations/shared.ts`
 * (event invitations) rather than a reuse of it — organization invitations
 * and event invitations are conceptually different relationships (no
 * `side` concept, a different role vocabulary, a different collection),
 * and the task that introduced this domain explicitly required the two
 * stay independent rather than being forced into one shared shape.
 */
import { ValidationError, validateRequiredEmail } from '../validation';

/**
 * Invitable organization roles. `owner` is deliberately excluded — there
 * is exactly one owner (the organization's creator), matching how
 * `INVITABLE_EVENT_ROLES` excludes `owner` for the same reason.
 */
export const INVITABLE_ORGANIZATION_ROLES = ['admin', 'planner', 'staff'] as const;

export interface CreateOrganizationInvitationFields {
  invitedEmail: string;
  role: string;
}

/** Validates the role. Throws ValidationError('invalid_role') if not invitable. */
export function validateOrganizationInvitationRole(role: unknown): string {
  if (
    !role ||
    typeof role !== 'string' ||
    !INVITABLE_ORGANIZATION_ROLES.includes(role as (typeof INVITABLE_ORGANIZATION_ROLES)[number])
  ) {
    throw new ValidationError('invalid_role', `Role must be one of: ${INVITABLE_ORGANIZATION_ROLES.join(', ')}`);
  }
  return role;
}

/** Validates the fields common to organization invitation creation. Throws ValidationError. */
export function validateOrganizationInvitationFields(
  obj: Record<string, unknown>
): CreateOrganizationInvitationFields {
  const invitedEmail = validateRequiredEmail(obj.invitedEmail);
  const role = validateOrganizationInvitationRole(obj.role);

  return { invitedEmail, role };
}

/** Deterministic-free invitation ID is just the auto-generated Firestore doc ID. */
export function buildOrganizationInvitationDocument(
  invitationId: string,
  organizationId: string,
  invitedBy: string,
  fields: CreateOrganizationInvitationFields,
  now: string,
  expiresAt: string
): Record<string, unknown> {
  return {
    id: invitationId,
    organizationId,
    invitedEmail: fields.invitedEmail,
    role: fields.role,
    status: 'pending',
    invitedBy,
    expiresAt,
    createdAt: now,
    updatedAt: now
  };
}
