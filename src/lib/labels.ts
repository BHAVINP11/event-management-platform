import { EventStatus, EventType } from '@/types/event';
import { EventMemberSide, EventRole, MembershipStatus, OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import { GuestSide, GuestStatus } from '@/types/guest';
import { EventFunctionStatus } from '@/types/eventFunction';
import { ExpenseCategory, PaymentStatus } from '@/types/expense';
import { VendorCategory, VendorStatus } from '@/types/vendor';
import { TaskStatus, TaskPriority } from '@/types/task';

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

const guestSideLabels: Record<GuestSide, string> = {
  [GuestSide.Bride]: 'Bride',
  [GuestSide.Groom]: 'Groom',
  [GuestSide.Both]: 'Both'
};

const guestStatusLabels: Record<GuestStatus, string> = {
  [GuestStatus.Pending]: 'Pending',
  [GuestStatus.Invited]: 'Invited',
  [GuestStatus.Confirmed]: 'Confirmed',
  [GuestStatus.Declined]: 'Declined'
};

const eventFunctionStatusLabels: Record<EventFunctionStatus, string> = {
  [EventFunctionStatus.Planned]: 'Planned',
  [EventFunctionStatus.Confirmed]: 'Confirmed',
  [EventFunctionStatus.Completed]: 'Completed',
  [EventFunctionStatus.Cancelled]: 'Cancelled'
};

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Venue]: 'Venue',
  [ExpenseCategory.Catering]: 'Catering',
  [ExpenseCategory.Decoration]: 'Decoration',
  [ExpenseCategory.Photography]: 'Photography',
  [ExpenseCategory.Entertainment]: 'Entertainment',
  [ExpenseCategory.Transportation]: 'Transportation',
  [ExpenseCategory.Accommodation]: 'Accommodation',
  [ExpenseCategory.Jewellery]: 'Jewellery',
  [ExpenseCategory.Clothing]: 'Clothing',
  [ExpenseCategory.Invitation]: 'Invitation',
  [ExpenseCategory.Other]: 'Other'
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Unpaid]: 'Unpaid',
  [PaymentStatus.PartiallyPaid]: 'Partially Paid',
  [PaymentStatus.Paid]: 'Paid'
};

const vendorCategoryLabels: Record<VendorCategory, string> = {
  [VendorCategory.Venue]: 'Venue',
  [VendorCategory.Catering]: 'Catering',
  [VendorCategory.Decoration]: 'Decoration',
  [VendorCategory.Photography]: 'Photography',
  [VendorCategory.Videography]: 'Videography',
  [VendorCategory.Entertainment]: 'Entertainment',
  [VendorCategory.Transportation]: 'Transportation',
  [VendorCategory.Accommodation]: 'Accommodation',
  [VendorCategory.Jewellery]: 'Jewellery',
  [VendorCategory.Makeup]: 'Makeup',
  [VendorCategory.Invitation]: 'Invitation',
  [VendorCategory.Other]: 'Other'
};

const vendorStatusLabels: Record<VendorStatus, string> = {
  [VendorStatus.Enquiry]: 'Enquiry',
  [VendorStatus.Shortlisted]: 'Shortlisted',
  [VendorStatus.Confirmed]: 'Confirmed',
  [VendorStatus.Cancelled]: 'Cancelled'
};

const taskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: 'To Do',
  [TaskStatus.InProgress]: 'In Progress',
  [TaskStatus.Completed]: 'Completed',
  [TaskStatus.Cancelled]: 'Cancelled'
};

const taskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.Low]: 'Low',
  [TaskPriority.Medium]: 'Medium',
  [TaskPriority.High]: 'High'
};

export const eventTypeLabel = (type: EventType): string => eventTypeLabels[type];
export const eventStatusLabel = (status: EventStatus): string => eventStatusLabels[status];
export const eventRoleLabel = (role: EventRole): string => eventRoleLabels[role];
export const organizationRoleLabel = (role: OrganizationRole): string =>
  organizationRoleLabels[role];
export const eventMemberSideLabel = (side: EventMemberSide): string => eventMemberSideLabels[side];
export const invitationStatusLabel = (status: InvitationStatus): string => invitationStatusLabels[status];
export const membershipStatusLabel = (status: MembershipStatus): string => membershipStatusLabels[status];
export const guestSideLabel = (side: GuestSide): string => guestSideLabels[side];
export const guestStatusLabel = (status: GuestStatus): string => guestStatusLabels[status];
export const eventFunctionStatusLabel = (status: EventFunctionStatus): string => eventFunctionStatusLabels[status];
export const expenseCategoryLabel = (category: ExpenseCategory): string => expenseCategoryLabels[category];
export const paymentStatusLabel = (status: PaymentStatus): string => paymentStatusLabels[status];
export const vendorCategoryLabel = (category: VendorCategory): string => vendorCategoryLabels[category];
export const vendorStatusLabel = (status: VendorStatus): string => vendorStatusLabels[status];
export const taskStatusLabel = (status: TaskStatus): string => taskStatusLabels[status];
export const taskPriorityLabel = (priority: TaskPriority): string => taskPriorityLabels[priority];

/**
 * The user's relationship to an event, for identity contexts (shell
 * sidebar/header) — richer than `eventRoleLabel` alone: "Bride · Couple"
 * rather than just "Bride", since here the role itself (not just the
 * side) is worth keeping visible. Only Couple combines with a side today;
 * every other role (including Family, which can also carry a side)
 * displays as its plain role label.
 */
export const eventRoleIdentityLabel = (role: EventRole, side: EventMemberSide | null | undefined): string =>
  role === EventRole.Couple && side ? `${eventMemberSideLabel(side)} · ${eventRoleLabel(role)}` : eventRoleLabel(role);
