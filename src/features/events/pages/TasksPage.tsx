import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTaskList } from '@/features/events/hooks/useTaskList';
import { TaskForm } from '@/features/events/components/TaskForm';
import { TaskList } from '@/features/events/components/TaskList';
import { canManageAllTasks, canUpdateTask } from '@/features/events/services/taskAuthorization';
import { sortTasksByDueDate } from '@/features/events/services/taskSorting';
import { taskService } from '@/app/services';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { TaskError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type StatusFilter = 'all' | TaskStatus;
type PriorityFilter = 'all' | TaskPriority;
type AssigneeFilter = 'all' | 'unassigned' | string;
type FormMode = 'closed' | 'add' | Task;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: TaskStatus.Todo, label: taskStatusLabel(TaskStatus.Todo) },
  { id: TaskStatus.InProgress, label: taskStatusLabel(TaskStatus.InProgress) },
  { id: TaskStatus.Completed, label: taskStatusLabel(TaskStatus.Completed) },
  { id: TaskStatus.Cancelled, label: taskStatusLabel(TaskStatus.Cancelled) }
];

const PRIORITY_FILTER_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All priorities' },
  ...Object.values(TaskPriority).map((priority) => ({ value: priority, label: taskPriorityLabel(priority) }))
];

function TasksNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <EmptyState
      title={title}
      description={body}
      action={
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

function matchesStatusFilter(task: Task, filter: StatusFilter): boolean {
  return filter === 'all' || task.status === filter;
}

function matchesPriorityFilter(task: Task, filter: PriorityFilter): boolean {
  return filter === 'all' || task.priority === filter;
}

function matchesAssigneeFilter(task: Task, filter: AssigneeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unassigned') return !task.assignedTo;
  return task.assignedTo === filter;
}

function matchesSearch(task: Task, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  const term = search.trim().toLowerCase();
  return task.title.toLowerCase().includes(term) || Boolean(task.description?.toLowerCase().includes(term));
}

/**
 * `/events/:eventId/tasks` — the event's task list. Same access check as
 * the workspace Overview. Owner/planner may add/edit/delete any task;
 * staff may edit (including Mark Complete) only a task assigned to
 * themselves, and may never create or delete — enforced for real by the
 * createTask/updateTask/deleteTask Cloud Functions regardless of what
 * this page shows. Search/status/priority/assignee filters and sorting
 * all run client-side over the already-loaded (already-scoped) list — no
 * new queries.
 */
export function TasksPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useTaskList(user?.id ?? null, eventId);
  const { show: showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleTasks = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return sortTasksByDueDate(state.data.tasks).filter(
      (task) =>
        matchesStatusFilter(task, statusFilter) &&
        matchesPriorityFilter(task, priorityFilter) &&
        matchesAssigneeFilter(task, assigneeFilter) &&
        matchesSearch(task, search)
    );
  }, [state, statusFilter, priorityFilter, assigneeFilter, search]);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await taskService.deleteTask(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Task removed.', 'success');
      reload();
    } catch (err) {
      showToast(err instanceof TaskError ? err.friendlyMessage : "We couldn't remove this task right now.", 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkComplete = async (task: Task): Promise<void> => {
    try {
      await taskService.updateTask(task.id, {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        assignedTo: task.assignedTo,
        status: TaskStatus.Completed
      });
      showToast('Task marked complete.', 'success');
      reload();
    } catch (err) {
      showToast(err instanceof TaskError ? err.friendlyMessage : "We couldn't update this task right now.", 'danger');
    }
  };

  return (
    <section className="tasks-page">
      {state.status === 'loading' && <LoadingState label="Loading tasks…" />}

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

      {state.status === 'allowed' && eventId && (
        <>
          <div className="tasks-header">
            <div>
              <h1>Tasks</h1>
              <p className="tasks-subtitle">Keep event planning on track, one task at a time.</p>
            </div>
            {state.data.canManageAll && <Button onClick={() => setFormMode('add')}>+ Add Task</Button>}
          </div>

          {state.data.tasks.length > 0 && (
            <p className="tasks-count">
              {state.data.tasks.length} task{state.data.tasks.length === 1 ? '' : 's'}
            </p>
          )}

          {state.data.tasks.length > 0 && (
            <div className="tasks-toolbar">
              <div className="tasks-search">
                <Input
                  label="Search"
                  placeholder="Search by title or description"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Tabs tabs={STATUS_TABS} activeId={statusFilter} onChange={(id) => setStatusFilter(id as StatusFilter)} />
              <div className="tasks-priority-filter">
                <Select
                  label="Priority"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                  options={PRIORITY_FILTER_OPTIONS}
                />
              </div>
              <div className="tasks-assignee-filter">
                <Select
                  label="Assignee"
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                  options={[
                    { value: 'all', label: 'Everyone' },
                    { value: 'unassigned', label: 'Unassigned' },
                    ...state.data.assignableMembers.map((member) => ({ value: member.userId, label: member.label }))
                  ]}
                />
              </div>
            </div>
          )}

          <TaskList
            tasks={visibleTasks}
            hasAnyTasks={state.data.tasks.length > 0}
            memberLabelByUserId={state.data.memberLabelByUserId}
            canManageAll={state.data.canManageAll}
            canEditTask={(task) => canUpdateTask(state.data.currentUserRole, state.data.currentUserId, task)}
            canDeleteTask={() => canManageAllTasks(state.data.currentUserRole)}
            onAdd={() => setFormMode('add')}
            onEdit={(task) => setFormMode(task)}
            onDelete={(task) => setDeleteTarget(task)}
            onMarkComplete={handleMarkComplete}
          />

          {formMode !== 'closed' && (
            <Modal open onClose={() => setFormMode('closed')} title={formMode === 'add' ? 'Add Task' : 'Edit Task'}>
              <TaskForm
                eventId={eventId}
                task={formMode === 'add' ? undefined : formMode}
                assignableMembers={state.data.assignableMembers}
                onSaved={(message) => {
                  setFormMode('closed');
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setFormMode('closed')}
              />
            </Modal>
          )}

          {deleteTarget && (
            <Modal open onClose={() => setDeleteTarget(null)} title="Remove task?">
              <p className="task-confirm-body">
                Remove &ldquo;{deleteTarget.title}&rdquo; from this event&apos;s tasks? This can&apos;t be undone.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                  {deleting ? 'Removing…' : 'Remove Task'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
