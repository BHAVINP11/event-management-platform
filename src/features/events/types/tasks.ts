import { EventRole } from '@/types/membership';
import { Task, TaskPriority, TaskStatus } from '@/types/task';

/** An active EventMember the current user may assign a task to. */
export interface AssignableMember {
  userId: string;
  /** Resolved display name when the viewer is permitted to read it (currently: themselves only), else a role-based label — see docs/tasks.md. */
  label: string;
}

export interface TaskListData {
  /** Every task for the event — no side-scoping for this domain. */
  tasks: Task[];
  /** Active EventMembers only, for the "Assigned To" field — never Guests. */
  assignableMembers: AssignableMember[];
  /** Every member's display label (any status), for rendering an already-assigned task even if the assignee later became inactive. */
  memberLabelByUserId: Record<string, string>;
  /** Whether the current user may add/edit/remove any task (owner/planner only). */
  canManageAll: boolean;
  currentUserId: string;
  currentUserRole?: EventRole;
}

export type TaskListAccessResult =
  | { status: 'allowed'; data: TaskListData }
  | { status: 'denied' }
  | { status: 'notFound' };

/** The editable task fields, shared by the add and edit forms. */
export interface TaskFormInput {
  title: string;
  description?: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
}
