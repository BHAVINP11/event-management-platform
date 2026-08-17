import { MembershipStatus, OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';

/** A row on the Organization Members page representing an accepted (or otherwise resolved) OrganizationMember. */
export interface OrganizationPersonSummary {
  id: string;
  userId: string;
  /** Resolved display name/email, only when the viewer is permitted to read it (currently: themselves only). */
  label: string | null;
  role: OrganizationRole;
  status: MembershipStatus;
  /** When this membership was created — the OrganizationMember's own `createdAt`. */
  joinedAt: string;
}

/** A row on the Organization Members page representing a pending invitation. */
export interface OrganizationInvitationSummary {
  id: string;
  invitedEmail: string;
  role: OrganizationRole;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface OrganizationPeopleData {
  members: OrganizationPersonSummary[];
  /** Pending invitations only — accepted/expired/cancelled ones are not shown. */
  invitations: OrganizationInvitationSummary[];
  /** Whether the current user may manage members/invitations (owner/admin). */
  canManage: boolean;
}

export type OrganizationPeopleAccessResult =
  | { status: 'allowed'; data: OrganizationPeopleData }
  | { status: 'denied' }
  | { status: 'notFound' };

/**
 * The organization role choices the invite/change-role forms offer.
 * `owner` is deliberately excluded — there is exactly one owner, the
 * organization's creator.
 */
export const INVITABLE_ORGANIZATION_ROLES: readonly OrganizationRole[] = [
  OrganizationRole.Admin,
  OrganizationRole.Planner,
  OrganizationRole.Staff
];

export interface OrganizationInvitationCreationInput {
  invitedEmail: string;
  role: OrganizationRole;
}
