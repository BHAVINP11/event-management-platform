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
  status: MembershipStatus;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}
