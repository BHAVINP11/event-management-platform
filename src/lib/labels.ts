import { EventStatus, EventType } from '@/types/event';
import { EventMemberSide, EventRole, MembershipStatus, OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';

/** Human-readable labels for the domain enums surfaced in the UI. */

const eventTypeLabels: Record<EventType, string> = {
  [EventType.Wedding]: 'Wedding',
  [EventType.Social]: 'Social gathering',
  [EventType.Corporate]: 'Corporate event',
  [EventType.Private]: 'Private celebration',
  [EventType.Other]: 'Event'
};

const eventStatusLabels: Record<EventStatus, string> = {
  [EventStatus.Draft]: 'Draft',
  [EventStatus.Active]: 'Active',
  [EventStatus.Completed]: 'Completed',
  [EventStatus.Archived]: 'Archived'
};

const eventRoleLabels: Record<EventRole, string> = {
  [EventRole.Owner]: 'Owner',
  [EventRole.Planner]: 'Planner',
  [EventRole.Couple]: 'Couple',
  [EventRole.Family]: 'Family',
  [EventRole.Staff]: 'Staff',
  [EventRole.Viewer]: 'Viewer'
};

const organizationRoleLabels: Record<OrganizationRole, string> = {
  [OrganizationRole.Owner]: 'Owner',
  [OrganizationRole.Admin]: 'Admin',
  [OrganizationRole.Planner]: 'Planner',
  [OrganizationRole.Staff]: 'Staff'
};

const eventMemberSideLabels: Record<EventMemberSide, string> = {
  [EventMemberSide.Bride]: 'Bride',
  [EventMemberSide.Groom]: 'Groom'
};

const invitationStatusLabels: Record<InvitationStatus, string> = {
  [InvitationStatus.Pending]: 'Pending',
  [InvitationStatus.Accepted]: 'Accepted',
  [InvitationStatus.Expired]: 'Expired',
  [InvitationStatus.Cancelled]: 'Cancelled'
};

const membershipStatusLabels: Record<MembershipStatus, string> = {
  [MembershipStatus.Active]: 'Active',
  [MembershipStatus.Pending]: 'Pending',
  [MembershipStatus.Revoked]: 'Revoked',
  [MembershipStatus.Inactive]: 'Inactive'
};

export const eventTypeLabel = (type: EventType): string => eventTypeLabels[type];
export const eventStatusLabel = (status: EventStatus): string => eventStatusLabels[status];
export const eventRoleLabel = (role: EventRole): string => eventRoleLabels[role];
export const organizationRoleLabel = (role: OrganizationRole): string =>
  organizationRoleLabels[role];
export const eventMemberSideLabel = (side: EventMemberSide): string => eventMemberSideLabels[side];
export const invitationStatusLabel = (status: InvitationStatus): string => invitationStatusLabels[status];
export const membershipStatusLabel = (status: MembershipStatus): string => membershipStatusLabels[status];
