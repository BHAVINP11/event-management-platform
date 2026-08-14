import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTaskList } from '@/features/events/hooks/useTaskList';
import { TaskForm } from '@/features/events/components/TaskForm';
import { TaskList } from '@/features/events/components/TaskList';
import { canManageAllTasks, canUpdateTask } from '@/features/events/services/taskAuthorization';
import { taskService } from '@/app/services';
import { Task, TaskStatus } from '@/types/task';
import { taskStatusLabel } from '@/lib/labels';
import { TaskError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

type StatusFilter = 'all' | TaskStatus;
type FormMode = 'closed' | 'add' | Task;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: TaskStatus.Todo, label: taskStatusLabel(TaskStatus.Todo) },
  { value: TaskStatus.InProgress, label: taskStatusLabel(TaskStatus.InProgress) },
  { value: TaskStatus.Completed, label: taskStatusLabel(TaskStatus.Completed) },
  { value: TaskStatus.Cancelled, label: taskStatusLabel(TaskStatus.Cancelled) }
];

function TasksNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="resource-notice">
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/dashboard" className="btn-secondary">
        Back to dashboard
      </Link>
    </div>
  );
}

/**
 * `/events/:eventId/tasks` — the event's task list. Same access check as
 * the workspace Overview. Owner/planner may add/edit/delete any task;
 * staff may edit (including Mark Complete) only a task assigned to
 * themselves, and may never create or delete — enforced for real by the
 * createTask/updateTask/deleteTask Cloud Functions regardless of what
 * this page shows. The status filter runs client-side over the
 * already-loaded list.
 */
export function TasksPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useTaskList(user?.id ?? null, eventId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleTasks = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return state.data.tasks.filter((task) => statusFilter === 'all' || task.status === statusFilter);
  }, [state, statusFilter]);

  if (state.status !== 'allowed') {
    return (
      <section className="resource-page">
        {state.status === 'loading' && <LoadingSkeleton cards={2} />}
        {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}
        {state.status === 'denied' && (
          <TasksNotice
            title="You don't have access to this event"
            body="Ask the event owner to invite you, then try again."
          />
        )}
        {state.status === 'notFound' && (
          <TasksNotice
            title="We couldn't find this event"
            body="It may have been removed, or the link may be out of date."
          />
        )}
        <style>{resourceStyles}</style>
      </section>
    );
  }

  const { data } = state;
  const canEditTask = (task: Task): boolean => canUpdateTask(data.currentUserRole, data.currentUserId, task);
  const canDeleteTask = (): boolean => canManageAllTasks(data.currentUserRole);

  const handleDelete = async (task: Task): Promise<void> => {
    if (!window.confirm(`Remove "${task.title}" from this event's tasks?`)) {
      return;
    }

    setActionError(null);
    try {
      await taskService.deleteTask(task.id);
      reload();
    } catch (err) {
      setActionError(err instanceof TaskError ? err.friendlyMessage : "We couldn't remove this task right now.");
    }
  };

  const handleMarkComplete = async (task: Task): Promise<void> => {
    setActionError(null);
    try {
      await taskService.updateTask(task.id, {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        assignedTo: task.assignedTo,
        status: TaskStatus.Completed
      });
      reload();
    } catch (err) {
      setActionError(err instanceof TaskError ? err.friendlyMessage : "We couldn't update this task right now.");
    }
  };

  return (
    <section className="resource-page">
      {eventId && (
        <>
          <div className="resource-section-header">
            <h1>Tasks</h1>
            {data.canManageAll && formMode === 'closed' && (
              <button type="button" className="btn-primary" onClick={() => setFormMode('add')}>
                + Add Task
              </button>
            )}
          </div>

          {formMode !== 'closed' && (
            <TaskForm
              eventId={eventId}
              task={formMode === 'add' ? undefined : formMode}
              assignableMembers={data.assignableMembers}
              onSaved={() => {
                setFormMode('closed');
                reload();
              }}
              onCancel={() => setFormMode('closed')}
            />
          )}

          <div className="guest-filter-tabs" style={{ marginBottom: '1.5rem' }}>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`guest-filter-tab ${statusFilter === filter.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {actionError && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              {actionError}
            </div>
          )}

          <TaskList
            tasks={visibleTasks}
            hasAnyTasks={data.tasks.length > 0}
            memberLabelByUserId={data.memberLabelByUserId}
            canEditTask={canEditTask}
            canDeleteTask={canDeleteTask}
            onEdit={(task) => setFormMode(task)}
            onDelete={handleDelete}
            onMarkComplete={handleMarkComplete}
          />
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
