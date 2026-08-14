import { canManageAllTasks, canUpdateTask } from '@/features/events/services/taskAuthorization';
import { EventRole } from '@/types/membership';

describe('canManageAllTasks', () => {
  test.each([EventRole.Owner, EventRole.Planner])('%s can manage all tasks', (role) => {
    expect(canManageAllTasks(role)).toBe(true);
  });

  test.each([EventRole.Couple, EventRole.Family, EventRole.Staff, EventRole.Viewer])(
    '%s cannot manage all tasks',
    (role) => {
      expect(canManageAllTasks(role)).toBe(false);
    }
  );

  test('undefined role cannot manage all tasks', () => {
    expect(canManageAllTasks(undefined)).toBe(false);
  });
});

describe('canUpdateTask', () => {
  test.each([EventRole.Owner, EventRole.Planner])('%s can update any task', (role) => {
    expect(canUpdateTask(role, 'user1', { assignedTo: 'someone-else' })).toBe(true);
    expect(canUpdateTask(role, 'user1', { assignedTo: undefined })).toBe(true);
  });

  test('staff can update a task assigned to themselves', () => {
    expect(canUpdateTask(EventRole.Staff, 'staff1', { assignedTo: 'staff1' })).toBe(true);
  });

  test('staff cannot update a task assigned to someone else', () => {
    expect(canUpdateTask(EventRole.Staff, 'staff1', { assignedTo: 'staff2' })).toBe(false);
  });

  test('staff cannot update an unassigned task', () => {
    expect(canUpdateTask(EventRole.Staff, 'staff1', { assignedTo: undefined })).toBe(false);
  });

  test.each([EventRole.Couple, EventRole.Family, EventRole.Viewer])(
    '%s cannot update a task, even their own',
    (role) => {
      expect(canUpdateTask(role, 'user1', { assignedTo: 'user1' })).toBe(false);
    }
  );
});
