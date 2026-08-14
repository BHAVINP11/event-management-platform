export enum OrganizationRole {
  Owner = 'owner',
  Admin = 'admin',
  Planner = 'planner',
  Staff = 'staff'
}

export enum EventRole {
  Owner = 'owner',
  Planner = 'planner',
  Couple = 'couple',
  Family = 'family',
  Staff = 'staff',
  Viewer = 'viewer'
}

export enum MembershipStatus {
  Active = 'active',
  Pending = 'pending',
  Revoked = 'revoked',
  Inactive = 'inactive'
}

/**
 * Which side of the event a couple/family member belongs to. Only
 * meaningful for EventRole.Couple and EventRole.Family — planner, staff, and
 * viewer memberships never have a side.
 */
export enum EventMemberSide {
  Bride = 'bride',
  Groom = 'groom'
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventMember {
  id: string;
  eventId: string;
  userId: string;
  role: EventRole;
  side?: EventMemberSide;
  status: MembershipStatus;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}
