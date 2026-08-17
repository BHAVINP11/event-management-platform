import { EventMemberSide, EventRole, MembershipStatus } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';

/** A row on the People page representing an accepted (or otherwise resolved) EventMember. */
export interface EventPersonSummary {
  id: string;
  userId: string;
  /** Resolved display name/email, only when the viewer is permitted to read it (currently: themselves only). */
  label: string | null;
  role: EventRole;
  side: EventMemberSide | null;
  status: MembershipStatus;
  /** When this membership was created — the EventMember's own `createdAt`. */
  joinedAt: string;
}

/** A row on the People page representing a pending invitation. */
export interface EventInvitationSummary {
  id: string;
  invitedEmail: string;
  role: EventRole;
  side: EventMemberSide | null;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface EventPeopleData {
  members: EventPersonSummary[];
  /** Pending invitations only — accepted/expired/cancelled ones are not shown. */
  invitations: EventInvitationSummary[];
  /** Whether the current user may invite more people (owner/planner). */
  canInvite: boolean;
}

export type EventPeopleAccessResult =
  | { status: 'allowed'; data: EventPeopleData }
  | { status: 'denied' }
  | { status: 'notFound' };

/**
 * The role choices the invite form offers. Bride/Groom map to
 * EventRole.Couple with an implied side; the rest map straight to an
 * EventRole with no side (Family's side, if any, is a separate form field).
 */
export type InviteRoleOption = 'bride' | 'groom' | 'family' | 'planner' | 'staff' | 'viewer';

export interface InviteFormInput {
  invitedEmail: string;
  roleOption: InviteRoleOption;
  /** Only meaningful when roleOption is 'family'. */
  familySide?: EventMemberSide;
}

export interface InvitationCreationInput {
  invitedEmail: string;
  role: EventRole;
  side?: EventMemberSide;
}

export interface RoleSide {
  role: EventRole;
  side?: EventMemberSide;
}

/**
 * Maps a user-facing role choice (Bride/Groom/Family/...) to the
 * EventRole + side the backend actually stores. Shared by the invite
 * form and the change-member-role form, so the two vocabularies can
 * never drift apart.
 */
export function roleOptionToRoleSide(roleOption: InviteRoleOption, familySide?: EventMemberSide): RoleSide {
  switch (roleOption) {
    case 'bride':
      return { role: EventRole.Couple, side: EventMemberSide.Bride };
    case 'groom':
      return { role: EventRole.Couple, side: EventMemberSide.Groom };
    case 'family':
      return { role: EventRole.Family, side: familySide };
    case 'planner':
      return { role: EventRole.Planner };
    case 'staff':
      return { role: EventRole.Staff };
    case 'viewer':
      return { role: EventRole.Viewer };
  }
}

/** Maps a user-facing invite choice to the underlying role/side the backend stores. */
export function resolveInviteRole(input: InviteFormInput): InvitationCreationInput {
  return { invitedEmail: input.invitedEmail, ...roleOptionToRoleSide(input.roleOption, input.familySide) };
}

/** The inverse of `roleOptionToRoleSide` — used to pre-select a member's current role in the change-role form. */
export function roleSideToRoleOption(role: EventRole, side: EventMemberSide | null | undefined): InviteRoleOption {
  if (role === EventRole.Couple) {
    return side === EventMemberSide.Groom ? 'groom' : 'bride';
  }
  if (role === EventRole.Family) {
    return 'family';
  }
  if (role === EventRole.Planner) {
    return 'planner';
  }
  if (role === EventRole.Staff) {
    return 'staff';
  }
  return 'viewer';
}

/**
 * The label shown in the People page's "Role" column. When a side is set,
 * the side (Bride/Groom) is more informative than the generic "Couple"
 * role, so it takes precedence.
 */
export function personRoleDisplayLabel(
  role: EventRole,
  side: EventMemberSide | null | undefined,
  roleLabel: (role: EventRole) => string,
  sideLabel: (side: EventMemberSide) => string
): string {
  return side ? sideLabel(side) : roleLabel(role);
}
