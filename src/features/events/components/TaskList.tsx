import { Task, TaskStatus } from '@/types/task';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { taskPriorityBadgeVariant, taskStatusBadgeVariant } from '@/lib/badgeVariants';
import { formatEventDate, isBeforeToday } from '@/lib/date';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

function TaskCard({
  task,
  assignedLabel,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onMarkComplete
}: {
  task: Task;
  assignedLabel: string | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkComplete: () => void;
}): JSX.Element {
  const dueDate = formatEventDate(task.dueDate);
  const overdue =
    isBeforeToday(task.dueDate) && task.status !== TaskStatus.Completed && task.status !== TaskStatus.Cancelled;
  const canComplete = canEdit && task.status !== TaskStatus.Completed && task.status !== TaskStatus.Cancelled;

  return (
    <Card padded className="task-card">
      <div className="task-card-header">
        <h3>{task.title}</h3>
        <Badge variant={taskStatusBadgeVariant(task.status)}>{taskStatusLabel(task.status)}</Badge>
      </div>

      <div className="task-card-badges">
        <Badge variant={taskPriorityBadgeVariant(task.priority)}>{taskPriorityLabel(task.priority)}</Badge>
      </div>

      <div className="task-meta">
        {dueDate && <span className={overdue ? 'task-due-date--overdue' : undefined}>{overdue ? 'Overdue: ' : 'Due '}{dueDate}</span>}
        {assignedLabel && <span>Assigned to {assignedLabel}</span>}
      </div>

      {task.description && <p className="task-description">{task.description}</p>}

      {(canEdit || canDelete) && (
        <div className="task-card-actions">
          {canComplete && (
            <Button variant="secondary" size="sm" onClick={onMarkComplete}>
              Mark Complete
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="secondary" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * The task cards for `/events/:eventId/tasks`. `tasks` is the already
 * filtered/searched/sorted list; `hasAnyTasks` distinguishes "no tasks on
 * this event yet" from "no tasks match the current filter/search," which
 * need different empty-state copy. `canEditTask`/`canDeleteTask` are
 * supplied per row by the page — owner/planner may edit/delete any task;
 * staff may only edit (never delete) a task assigned to themselves.
 */
export function TaskList({
  tasks,
  hasAnyTasks,
  memberLabelByUserId,
  canManageAll,
  canEditTask,
  canDeleteTask,
  onAdd,
  onEdit,
  onDelete,
  onMarkComplete
}: {
  tasks: readonly Task[];
  hasAnyTasks: boolean;
  memberLabelByUserId: Record<string, string>;
  canManageAll: boolean;
  canEditTask: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMarkComplete: (task: Task) => void;
}): JSX.Element {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title={hasAnyTasks ? 'No tasks match your search' : 'No tasks yet'}
        description={
          hasAnyTasks
            ? 'Try a different title, description, or filter.'
            : 'Add tasks to keep your event planning on track.'
        }
        action={canManageAll && !hasAnyTasks ? <Button onClick={onAdd}>+ Add Task</Button> : undefined}
      />
    );
  }

  return (
    <div className="tasks-grid">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          assignedLabel={task.assignedTo ? memberLabelByUserId[task.assignedTo] ?? 'Member' : null}
          canEdit={canEditTask(task)}
          canDelete={canDeleteTask(task)}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task)}
          onMarkComplete={() => onMarkComplete(task)}
        />
      ))}
    </div>
  );
}
