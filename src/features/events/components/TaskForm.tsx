import { FormEvent, useState } from 'react';
import { taskService } from '@/app/services';
import { AssignableMember, TaskFormInput } from '@/features/events/types/tasks';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { TaskError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

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
 * Add/edit task form — the content of the Modal that hosts it. Only
 * mounted for users who may create/edit this task (owner/planner always;
 * staff only when editing a task already assigned to themselves — see
 * `canUpdateTask` in `taskAuthorization.ts`). `assignedTo` only ever
 * offers `assignableMembers` — active EventMembers of this event, never
 * Guests — and createTask/updateTask independently re-verify the chosen
 * assignee server-side regardless. `eventId`/`createdBy`/`id`/`createdAt`
 * are never part of this form; the Cloud Function derives or preserves
 * them itself.
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
  onSaved: (message: string) => void;
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
        onSaved('Task updated.');
      } else {
        await taskService.createTask(eventId, input);
        onSaved('Task added.');
      }
    } catch (err) {
      setError(err instanceof TaskError ? err.friendlyMessage : "We couldn't save this task right now.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <Input label="Title *" name="title" value={fields.title} onChange={handleChange} required disabled={submitting} />

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="task-description">
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          className="field-control"
          rows={2}
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Due Date"
          name="dueDate"
          type="date"
          value={fields.dueDate}
          onChange={handleChange}
          disabled={submitting}
        />
        <Select
          label="Priority"
          name="priority"
          value={fields.priority}
          onChange={handleChange}
          disabled={submitting}
          options={PRIORITY_OPTIONS}
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Assigned To"
          name="assignedTo"
          value={fields.assignedTo}
          onChange={handleChange}
          disabled={submitting}
          options={[
            { value: '', label: 'Unassigned' },
            ...assignableMembers.map((member) => ({ value: member.userId, label: member.label }))
          ]}
        />
        <Select
          label="Status"
          name="status"
          value={fields.status}
          onChange={handleChange}
          disabled={submitting}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="auth-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : task ? 'Save Changes' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}
