import { Task } from '@/types/task';

/**
 * Chronological ordering for an event's tasks, done entirely client-side
 * over the already-loaded list — no new query.
 *
 * Dated tasks sort earliest due date first (overdue tasks naturally end
 * up first); undated tasks sort after every dated task, alphabetically
 * among themselves by title.
 */
export function sortTasksByDueDate(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return a.title.localeCompare(b.title);
    }
    if (!a.dueDate) {
      return 1;
    }
    if (!b.dueDate) {
      return -1;
    }

    const dateDiff = a.dueDate.localeCompare(b.dueDate);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return a.title.localeCompare(b.title);
  });
}
