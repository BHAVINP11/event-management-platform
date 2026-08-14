/**
 * A Task is a to-do item for an Event's planning (e.g. "Book the venue").
 * `assignedTo`, when present, is an EventMember's user ID — never a Guest
 * ID; a task can only ever be assigned to someone with a real membership
 * in the event.
 */
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
