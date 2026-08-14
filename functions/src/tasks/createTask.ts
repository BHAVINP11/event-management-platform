import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { loadActiveEventMembership } from '../shared/eventAuthority';
import { assertCanCreateTask } from './authorization';
import { TaskFields, assertAssigneeIsActiveEventMember, buildTaskDocument, validateTaskFields } from './shared';

export interface CreateTaskInput extends TaskFields {
  eventId: string;
}

export interface CreateTaskOutput {
  taskId: string;
}

interface AuthContext {
  uid: string;
}

export function validateCreateTaskInput(input: unknown): CreateTaskInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateTaskFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Creates a task after verifying the caller may create tasks for this
 * event (owner/planner only). If `assignedTo` is supplied, it must be an
 * active EventMember of the same event — never trusted as a bare user ID.
 * The client never chooses `id`, `createdBy`, or the timestamps.
 */
export async function createTask(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateTaskInput
): Promise<CreateTaskOutput> {
  const userId = auth.uid;

  const membership = await loadActiveEventMembership(db, input.eventId, userId);
  assertCanCreateTask(membership);

  if (input.assignedTo !== undefined) {
    await assertAssigneeIsActiveEventMember(db, input.eventId, input.assignedTo);
  }

  const now = new Date().toISOString();
  const taskRef = db.collection('tasks').doc();
  const taskId = taskRef.id;

  await taskRef.set(buildTaskDocument(taskId, input.eventId, userId, input, now, now));

  return { taskId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateTask(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateTaskOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateTaskInput(data);
  return createTask(db, { uid: context.auth.uid }, input);
}
