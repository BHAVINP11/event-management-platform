/**
 * Shared building blocks for event invitations.
 *
 * createInvitation and acceptInvitation both need the same role/side vocabulary
 * and produce/consume the same Invitation document shape, so validation and
 * document building live here once rather than in each function.
 */
import { ValidationError, validateRequiredEmail } from '../validation';

/**
 * Invitable event roles. `owner` is deliberately excluded — inviting someone
 * as owner is not allowed (there is exactly one owner, the event creator).
 */
export const INVITABLE_EVENT_ROLES = ['couple', 'family', 'planner', 'staff', 'viewer'] as const;

/** Roles for which a side (bride/groom) is a meaningful, allowed value. */
const SIDE_ALLOWED_ROLES = ['couple', 'family'];

export const INVITATION_SIDES = ['bride', 'groom'] as const;

export interface CreateInvitationFields {
  invitedEmail: string;
  role: string;
  side?: string;
}

/** Validates the role. Throws ValidationError('invalid_role') if not invitable. */
export function validateInvitationRole(role: unknown): string {
  if (!role || typeof role !== 'string' || !INVITABLE_EVENT_ROLES.includes(role as (typeof INVITABLE_EVENT_ROLES)[number])) {
    throw new ValidationError('invalid_role', `Role must be one of: ${INVITABLE_EVENT_ROLES.join(', ')}`);
  }
  return role;
}

/**
 * Validates the side against the already-validated role.
 *
 * - couple / family: side may be omitted, or must be bride/groom.
 * - planner / staff / viewer: side must be omitted.
 */
export function validateInvitationSide(side: unknown, role: string): string | undefined {
  if (side === undefined || side === null) {
    return undefined;
  }

  if (!SIDE_ALLOWED_ROLES.includes(role)) {
    throw new ValidationError('invalid_side', `Side is not applicable to role "${role}".`);
  }

  if (typeof side !== 'string' || !INVITATION_SIDES.includes(side as (typeof INVITATION_SIDES)[number])) {
    throw new ValidationError('invalid_side', `Side must be one of: ${INVITATION_SIDES.join(', ')}`);
  }

  return side;
}

/** Validates the fields common to invitation creation. Throws ValidationError. */
export function validateInvitationFields(obj: Record<string, unknown>): CreateInvitationFields {
  const invitedEmail = validateRequiredEmail(obj.invitedEmail);
  const role = validateInvitationRole(obj.role);
  const side = validateInvitationSide(obj.side, role);

  return { invitedEmail, role, side };
}

/** Deterministic-free invitation ID is just the auto-generated Firestore doc ID. */
export function buildInvitationDocument(
  invitationId: string,
  eventId: string,
  invitedBy: string,
  fields: CreateInvitationFields,
  now: string,
  expiresAt: string
): Record<string, unknown> {
  return {
    id: invitationId,
    eventId,
    invitedEmail: fields.invitedEmail,
    role: fields.role,
    side: fields.side ?? null,
    status: 'pending',
    invitedBy,
    expiresAt,
    createdAt: now,
    updatedAt: now
  };
}
