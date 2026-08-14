/**
 * Task access scoping — the client-side mirror of
 * `functions/src/tasks/authorization.ts`. Used only to decide what the UI
 * offers (whether to show Add/Edit/Delete, whether a given row's Edit/Mark
 * Complete controls render); the Cloud Functions remain the actual
 * authority, re-deriving the same scope independently.
 *
 * Not a generic permission engine — a small, task-specific helper, kept in
 * sync with its backend counterpart by hand (the two run in separate
 * TypeScript projects, like every other role/enum duplicated between
 * `functions/src` and `src/types` in this app).
 */
import { EventRole } from '@/types/membership';
import { Task } from '@/types/task';

const FULL_ACCESS_ROLES: readonly EventRole[] = [EventRole.Owner, EventRole.Planner];

/** Whether the role may create or delete tasks at all, and update any task. Owner/planner only. */
export function canManageAllTasks(role: EventRole | undefined): boolean {
  return Boolean(role && FULL_ACCESS_ROLES.includes(role));
}

/**
 * Whether the current user may update the given task: owner/planner may
 * update any task; staff may only update a task currently assigned to
 * themselves; everyone else may never update.
 */
export function canUpdateTask(
  role: EventRole | undefined,
  currentUserId: string,
  task: Pick<Task, 'assignedTo'>
): boolean {
  if (canManageAllTasks(role)) {
    return true;
  }
  if (role === EventRole.Staff) {
    return task.assignedTo !== undefined && task.assignedTo === currentUserId;
  }
  return false;
}
