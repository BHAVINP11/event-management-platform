/**
 * Shared building blocks for task management.
 *
 * createTask and updateTask both validate the same fields and build the
 * same document shape, so both live here rather than being duplicated.
 */
import { ValidationError } from '../validation';
import { getEventMembershipId } from '../shared/membershipIds';

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

export interface TaskFields {
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  priority: string;
  assignedTo?: string;
}

function validateTitle(title: unknown): string {
  if (!title || typeof title !== 'string') {
    throw new ValidationError('invalid_title', 'Title must be a non-empty string.');
  }

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    throw new ValidationError('invalid_title', `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`);
  }

  return title;
}

function validateDescription(description: unknown): string | undefined {
  if (description === undefined || description === null) {
    return undefined;
  }

  if (typeof description !== 'string') {
    throw new ValidationError('invalid_description', 'Description must be a string.');
  }

  if (description.length > DESCRIPTION_MAX) {
    throw new ValidationError('invalid_description', `Description must be at most ${DESCRIPTION_MAX} characters.`);
  }

  return description;
}

function validateDueDate(dueDate: unknown): string | undefined {
  if (dueDate === undefined || dueDate === null) {
    return undefined;
  }

  if (typeof dueDate !== 'string' || isNaN(new Date(dueDate).getTime())) {
    throw new ValidationError('invalid_due_date', 'Due date must be a valid date string.');
  }

  return dueDate;
}

function validateStatus(status: unknown): string {
  if (status === undefined || status === null) {
    return 'todo';
  }

  if (typeof status !== 'string' || !TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
    throw new ValidationError('invalid_status', `Status must be one of: ${TASK_STATUSES.join(', ')}`);
  }

  return status;
}

function validatePriority(priority: unknown): string {
  if (priority === undefined || priority === null) {
    return 'medium';
  }

  if (typeof priority !== 'string' || !TASK_PRIORITIES.includes(priority as (typeof TASK_PRIORITIES)[number])) {
    throw new ValidationError('invalid_priority', `Priority must be one of: ${TASK_PRIORITIES.join(', ')}`);
  }

  return priority;
}

function validateAssignedTo(assignedTo: unknown): string | undefined {
  if (assignedTo === undefined || assignedTo === null) {
    return undefined;
  }

  if (typeof assignedTo !== 'string' || assignedTo.length === 0) {
    throw new ValidationError('invalid_assigned_to', 'assignedTo must be a non-empty string.');
  }

  return assignedTo;
}

/** Validates the fields common to task creation and editing (format only). Throws ValidationError. */
export function validateTaskFields(obj: Record<string, unknown>): TaskFields {
  const title = validateTitle(obj.title);
  const description = validateDescription(obj.description);
  const dueDate = validateDueDate(obj.dueDate);
  const status = validateStatus(obj.status);
  const priority = validatePriority(obj.priority);
  const assignedTo = validateAssignedTo(obj.assignedTo);

  return { title, description, dueDate, status, priority, assignedTo };
}

/**
 * Verifies that `assignedTo`, if supplied, is an active EventMember of
 * `eventId` — never trusted as a bare user ID. Requires a real Firestore
 * lookup (unlike the rest of `validateTaskFields`), so it lives here as a
 * separate async step rather than folded into the pure field validator.
 *
 * A client cannot assign a task to a user outside the event, or to a user
 * whose membership is inactive, by supplying an arbitrary uid.
 */
export async function assertAssigneeIsActiveEventMember(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  assignedTo: string
): Promise<void> {
  const membershipId = getEventMembershipId(eventId, assignedTo);
  const snapshot = await db.collection('eventMembers').doc(membershipId).get();
  const membership = snapshot.data() as { eventId?: string; userId?: string; status?: string } | undefined;

  if (
    !snapshot.exists ||
    !membership ||
    membership.eventId !== eventId ||
    membership.userId !== assignedTo ||
    membership.status !== 'active'
  ) {
    throw new ValidationError('invalid_assigned_to', 'assignedTo must be an active member of this event.');
  }
}

/**
 * Builds a Firestore task document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createTask passes the
 * authenticated uid and "now"; updateTask passes the existing document's
 * values, so an edit can never change who created it or when. Optional
 * fields are omitted rather than stored as `undefined`.
 */
export function buildTaskDocument(
  taskId: string,
  eventId: string,
  createdBy: string,
  fields: TaskFields,
  createdAt: string,
  updatedAt: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: taskId,
    eventId,
    title: fields.title,
    status: fields.status,
    priority: fields.priority,
    createdBy,
    createdAt,
    updatedAt
  };

  if (fields.description !== undefined) {
    doc.description = fields.description;
  }
  if (fields.dueDate !== undefined) {
    doc.dueDate = fields.dueDate;
  }
  if (fields.assignedTo !== undefined) {
    doc.assignedTo = fields.assignedTo;
  }

  return doc;
}
