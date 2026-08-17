import { EventStatus } from '@/types/event';
import { GuestStatus } from '@/types/guest';
import { EventFunctionStatus } from '@/types/eventFunction';
import { PaymentStatus } from '@/types/expense';
import { VendorStatus } from '@/types/vendor';
import { TaskStatus, TaskPriority } from '@/types/task';
import { EventRole, MembershipStatus, OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import { BadgeVariant } from '@/components/ui/Badge';

/** Which Badge variant represents each event status — shared by every page that shows one. */
const eventStatusBadgeVariants: Record<EventStatus, BadgeVariant> = {
  [EventStatus.Draft]: 'neutral',
  [EventStatus.Active]: 'accent',
  [EventStatus.Completed]: 'success',
  [EventStatus.Archived]: 'neutral'
};

export const eventStatusBadgeVariant = (status: EventStatus): BadgeVariant => eventStatusBadgeVariants[status];

/** Which Badge variant represents each guest RSVP status. */
const guestStatusBadgeVariants: Record<GuestStatus, BadgeVariant> = {
  [GuestStatus.Pending]: 'neutral',
  [GuestStatus.Invited]: 'neutral',
  [GuestStatus.Confirmed]: 'success',
  [GuestStatus.Declined]: 'danger'
};

export const guestStatusBadgeVariant = (status: GuestStatus): BadgeVariant => guestStatusBadgeVariants[status];

/** Which Badge variant represents each function/ceremony status. */
const eventFunctionStatusBadgeVariants: Record<EventFunctionStatus, BadgeVariant> = {
  [EventFunctionStatus.Planned]: 'neutral',
  [EventFunctionStatus.Confirmed]: 'accent',
  [EventFunctionStatus.Completed]: 'success',
  [EventFunctionStatus.Cancelled]: 'danger'
};

export const eventFunctionStatusBadgeVariant = (status: EventFunctionStatus): BadgeVariant =>
  eventFunctionStatusBadgeVariants[status];

/** Which Badge variant represents each expense payment status. */
const paymentStatusBadgeVariants: Record<PaymentStatus, BadgeVariant> = {
  [PaymentStatus.Unpaid]: 'warning',
  [PaymentStatus.PartiallyPaid]: 'accent',
  [PaymentStatus.Paid]: 'success'
};

export const paymentStatusBadgeVariant = (status: PaymentStatus): BadgeVariant => paymentStatusBadgeVariants[status];

/** Which Badge variant represents each vendor status. */
const vendorStatusBadgeVariants: Record<VendorStatus, BadgeVariant> = {
  [VendorStatus.Enquiry]: 'neutral',
  [VendorStatus.Shortlisted]: 'accent',
  [VendorStatus.Confirmed]: 'success',
  [VendorStatus.Cancelled]: 'danger'
};

export const vendorStatusBadgeVariant = (status: VendorStatus): BadgeVariant => vendorStatusBadgeVariants[status];

/** Which Badge variant represents each task status. */
const taskStatusBadgeVariants: Record<TaskStatus, BadgeVariant> = {
  [TaskStatus.Todo]: 'neutral',
  [TaskStatus.InProgress]: 'accent',
  [TaskStatus.Completed]: 'success',
  [TaskStatus.Cancelled]: 'danger'
};

export const taskStatusBadgeVariant = (status: TaskStatus): BadgeVariant => taskStatusBadgeVariants[status];

/** Which Badge variant represents each task priority. */
const taskPriorityBadgeVariants: Record<TaskPriority, BadgeVariant> = {
  [TaskPriority.Low]: 'neutral',
  [TaskPriority.Medium]: 'warning',
  [TaskPriority.High]: 'danger'
};

export const taskPriorityBadgeVariant = (priority: TaskPriority): BadgeVariant => taskPriorityBadgeVariants[priority];

/** Which Badge variant represents each event membership role. */
const eventRoleBadgeVariants: Record<EventRole, BadgeVariant> = {
  [EventRole.Owner]: 'accent',
  [EventRole.Planner]: 'accent',
  [EventRole.Couple]: 'success',
  [EventRole.Family]: 'neutral',
  [EventRole.Staff]: 'neutral',
  [EventRole.Viewer]: 'neutral'
};

export const eventRoleBadgeVariant = (role: EventRole): BadgeVariant => eventRoleBadgeVariants[role];

/** Which Badge variant represents each organization membership role. */
const organizationRoleBadgeVariants: Record<OrganizationRole, BadgeVariant> = {
  [OrganizationRole.Owner]: 'accent',
  [OrganizationRole.Admin]: 'accent',
  [OrganizationRole.Planner]: 'neutral',
  [OrganizationRole.Staff]: 'neutral'
};

export const organizationRoleBadgeVariant = (role: OrganizationRole): BadgeVariant =>
  organizationRoleBadgeVariants[role];

/** Which Badge variant represents each event membership status. */
const membershipStatusBadgeVariants: Record<MembershipStatus, BadgeVariant> = {
  [MembershipStatus.Active]: 'success',
  [MembershipStatus.Pending]: 'warning',
  [MembershipStatus.Revoked]: 'danger',
  [MembershipStatus.Inactive]: 'neutral'
};

export const membershipStatusBadgeVariant = (status: MembershipStatus): BadgeVariant =>
  membershipStatusBadgeVariants[status];

/** Which Badge variant represents each invitation status. */
const invitationStatusBadgeVariants: Record<InvitationStatus, BadgeVariant> = {
  [InvitationStatus.Pending]: 'warning',
  [InvitationStatus.Accepted]: 'success',
  [InvitationStatus.Expired]: 'neutral',
  [InvitationStatus.Cancelled]: 'danger'
};

export const invitationStatusBadgeVariant = (status: InvitationStatus): BadgeVariant =>
  invitationStatusBadgeVariants[status];
