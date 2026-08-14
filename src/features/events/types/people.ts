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
}

/** A row on the People page representing a pending invitation. */
export interface EventInvitationSummary {
  id: string;
  invitedEmail: string;
  role: EventRole;
  side: EventMemberSide | null;
  status: InvitationStatus;
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

/** Maps a user-facing invite choice to the underlying role/side the backend stores. */
export function resolveInviteRole(input: InviteFormInput): InvitationCreationInput {
  const invitedEmail = input.invitedEmail;

  switch (input.roleOption) {
    case 'bride':
      return { invitedEmail, role: EventRole.Couple, side: EventMemberSide.Bride };
    case 'groom':
      return { invitedEmail, role: EventRole.Couple, side: EventMemberSide.Groom };
    case 'family':
      return { invitedEmail, role: EventRole.Family, side: input.familySide };
    case 'planner':
      return { invitedEmail, role: EventRole.Planner };
    case 'staff':
      return { invitedEmail, role: EventRole.Staff };
    case 'viewer':
      return { invitedEmail, role: EventRole.Viewer };
  }
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
