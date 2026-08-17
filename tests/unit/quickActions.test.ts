import { getVisibleQuickActionKeys } from '@/features/events/services/quickActions';
import { EventRole } from '@/types/membership';

/**
 * UI-11 audit fix: the Overview page's Quick Actions row used to show
 * "+ Add Guest/Task/Expense/Vendor" to every role unconditionally,
 * regardless of whether the existing per-domain authorization (
 * `canManageGuests`, `canManageAllTasks`, and the Owner/Planner
 * "management role" check Expenses/Vendors already enforce server-side)
 * would actually allow the action. These tests pin the corrected,
 * per-role behavior.
 */
describe('getVisibleQuickActionKeys', () => {
  test('Owner sees every quick action', () => {
    expect(getVisibleQuickActionKeys(EventRole.Owner)).toEqual(['guest', 'task', 'expense', 'vendor']);
  });

  test('Planner sees every quick action', () => {
    expect(getVisibleQuickActionKeys(EventRole.Planner)).toEqual(['guest', 'task', 'expense', 'vendor']);
  });

  test('Couple sees only Add Guest (their own side), not Task/Expense/Vendor', () => {
    expect(getVisibleQuickActionKeys(EventRole.Couple)).toEqual(['guest']);
  });

  test('Family sees no quick actions', () => {
    expect(getVisibleQuickActionKeys(EventRole.Family)).toEqual([]);
  });

  test('Staff sees no quick actions (cannot create tasks, only update assigned ones)', () => {
    expect(getVisibleQuickActionKeys(EventRole.Staff)).toEqual([]);
  });

  test('Viewer sees no quick actions', () => {
    expect(getVisibleQuickActionKeys(EventRole.Viewer)).toEqual([]);
  });
});
