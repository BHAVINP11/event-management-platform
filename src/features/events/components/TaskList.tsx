import { Task, TaskStatus } from '@/types/task';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { formatEventDate } from '@/lib/date';

const statusTagClass: Record<Task['status'], string> = {
  [TaskStatus.Todo]: 'status-draft',
  [TaskStatus.InProgress]: 'status-draft',
  [TaskStatus.Completed]: 'status-active',
  [TaskStatus.Cancelled]: 'status-archived'
};

function TaskRow({
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
  const canComplete = canEdit && task.status !== TaskStatus.Completed && task.status !== TaskStatus.Cancelled;

  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        <div className="resource-meta">
          {dueDate && <span className="resource-tag">Due {dueDate}</span>}
          <span className="resource-tag">{taskPriorityLabel(task.priority)}</span>
          {assignedLabel && <span className="resource-tag">{assignedLabel}</span>}
          <span className={`resource-tag ${statusTagClass[task.status]}`}>{taskStatusLabel(task.status)}</span>
        </div>
      </div>

      {(canEdit || canDelete) && (
        <div className="resource-card-actions">
          {canComplete && (
            <button type="button" className="btn-secondary" onClick={onMarkComplete}>
              Mark Complete
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn-secondary" onClick={onEdit}>
              Edit
            </button>
          )}
          {canDelete && (
            <button type="button" className="btn-secondary" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The task rows for `/events/:eventId/tasks`. `tasks` is the already
 * filtered (by status tab) list; `hasAnyTasks` distinguishes "no tasks on
 * this event yet" from "no tasks match the current filter," which need
 * different empty-state copy. `canEdit`/`canDelete` are supplied per row
 * by the page (owner/planner may edit/delete any task; staff may only
 * edit — never delete — a task assigned to themselves).
 */
export function TaskList({
  tasks,
  hasAnyTasks,
  memberLabelByUserId,
  canEditTask,
  canDeleteTask,
  onEdit,
  onDelete,
  onMarkComplete
}: {
  tasks: readonly Task[];
  hasAnyTasks: boolean;
  memberLabelByUserId: Record<string, string>;
  canEditTask: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMarkComplete: (task: Task) => void;
}): JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="resource-empty">
        <p>{hasAnyTasks ? 'No tasks match this filter.' : 'No tasks added yet.'}</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {tasks.map((task) => (
        <TaskRow
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
    </ul>
  );
}
