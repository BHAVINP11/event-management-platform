import { FormEvent, useState } from 'react';
import { taskService } from '@/app/services';
import { AssignableMember, TaskFormInput } from '@/features/events/types/tasks';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { TaskError } from '@/lib/appError';

const PRIORITY_OPTIONS = Object.values(TaskPriority).map((priority) => ({
  value: priority,
  label: taskPriorityLabel(priority)
}));

const STATUS_OPTIONS = Object.values(TaskStatus).map((status) => ({
  value: status,
  label: taskStatusLabel(status)
}));

interface TaskFormFields {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  assignedTo: string;
  status: TaskStatus;
}

const toFields = (task: Task | undefined): TaskFormFields => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  dueDate: task?.dueDate ?? '',
  priority: task?.priority ?? TaskPriority.Medium,
  assignedTo: task?.assignedTo ?? '',
  status: task?.status ?? TaskStatus.Todo
});

const toInput = (fields: TaskFormFields): TaskFormInput => ({
  title: fields.title,
  priority: fields.priority,
  status: fields.status,
  ...(fields.description && { description: fields.description }),
  ...(fields.dueDate && { dueDate: fields.dueDate }),
  ...(fields.assignedTo && { assignedTo: fields.assignedTo })
});

/**
 * Add/edit task form. Only mounted for users who may create/edit this
 * task (owner/planner always; staff only when editing a task already
 * assigned to themselves — see `canEditTask` in `taskAuthorization.ts`).
 * `assignedTo` only ever offers `assignableMembers` — active EventMembers
 * of this event, never Guests — and createTask/updateTask independently
 * re-verify the chosen assignee server-side regardless. `eventId`/
 * `createdBy`/`id`/`createdAt` are never part of this form; the Cloud
 * Function derives or preserves them itself.
 */
export function TaskForm({
  eventId,
  task,
  assignableMembers,
  onSaved,
  onCancel
}: {
  eventId: string;
  task?: Task;
  assignableMembers: readonly AssignableMember[];
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<TaskFormFields>(toFields(task));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input = toInput(fields);
      if (task) {
        await taskService.updateTask(task.id, input);
      } else {
        await taskService.createTask(eventId, input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof TaskError ? err.friendlyMessage : "We couldn't save this task right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="task-title">Title *</label>
        <input
          id="task-title"
          name="title"
          type="text"
          value={fields.title}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          name="description"
          rows={2}
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-due-date">Due Date</label>
          <input
            id="task-due-date"
            name="dueDate"
            type="date"
            value={fields.dueDate}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-priority">Priority</label>
          <select id="task-priority" name="priority" value={fields.priority} onChange={handleChange} disabled={submitting}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-assigned-to">Assigned To</label>
          <select
            id="task-assigned-to"
            name="assignedTo"
            value={fields.assignedTo}
            onChange={handleChange}
            disabled={submitting}
          >
            <option value="">Unassigned</option>
            {assignableMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="task-status">Status</label>
          <select id="task-status" name="status" value={fields.status} onChange={handleChange} disabled={submitting}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : task ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}
