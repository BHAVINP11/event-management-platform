import { ComponentType } from 'react';
import { EventRole } from '@/types/membership';
import { canManageGuests } from '@/features/events/services/guestAuthorization';
import { canManageAllTasks } from '@/features/events/services/taskAuthorization';
import { IconBriefcase, IconCheckSquare, IconProps, IconReceipt, IconUserPlus } from '@/components/ui/icons';

export type QuickActionKey = 'guest' | 'task' | 'expense' | 'vendor';

export const QUICK_ACTION_DEFINITIONS: Record<
  QuickActionKey,
  { label: string; description: string; segment: string; icon: ComponentType<IconProps> }
> = {
  guest: { label: 'Add Guest', description: 'Invite someone to your event', segment: 'guests', icon: IconUserPlus },
  task: { label: 'Add Task', description: 'Keep planning on track', segment: 'tasks', icon: IconCheckSquare },
  expense: { label: 'Add Expense', description: 'Track your spending', segment: 'expenses', icon: IconReceipt },
  vendor: { label: 'Add Vendor', description: 'Manage your suppliers', segment: 'vendors', icon: IconBriefcase }
};

/**
 * Whether this role has the same "Owner/Planner" management authority
 * that gates Expense/Vendor creation server-side — `expenseService.ts`/
 * `vendorService.ts`'s local `MANAGEMENT_ROLES` and
 * `functions/src/shared/eventAuthority.ts`'s `EVENT_MANAGEMENT_ROLES`
 * both use this exact same [Owner, Planner] set. Exported for reuse
 * anywhere else that needs "can this role manage event-level things" —
 * e.g. the hero's Edit Event affordance.
 */
export function hasEventManagementRole(role: EventRole): boolean {
  return role === EventRole.Owner || role === EventRole.Planner;
}

/**
 * Which Quick Action shortcuts the Overview page should show for this
 * role. Each key is gated by the same existing authorization result its
 * destination page enforces, reused here rather than reinterpreted:
 * `canManageGuests` (owner/planner/couple) and `canManageAllTasks`
 * (owner/planner) are the very functions Guests/Tasks already import;
 * Expenses/Vendors have no standalone exported helper, so the identical
 * Owner/Planner check already duplicated in both of those services is
 * mirrored here rather than left unchecked.
 */
export function getVisibleQuickActionKeys(role: EventRole): QuickActionKey[] {
  const keys: QuickActionKey[] = [];
  if (canManageGuests({ role })) keys.push('guest');
  if (canManageAllTasks(role)) keys.push('task');
  if (hasEventManagementRole(role)) keys.push('expense', 'vendor');
  return keys;
}
