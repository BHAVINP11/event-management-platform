import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { loadActiveEventMembership } from '../shared/eventAuthority';
import { assertCanDeleteTask } from './authorization';

export interface DeleteTaskInput {
  taskId: string;
}

export interface DeleteTaskOutput {
  taskId: string;
}

interface AuthContext {
  uid: string;
}

export function validateDeleteTaskInput(input: unknown): DeleteTaskInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.taskId || typeof obj.taskId !== 'string') {
    throw new ValidationError('invalid_task_id', 'taskId must be a non-empty string.');
  }

  return { taskId: obj.taskId };
}

/**
 * Deletes a task after verifying the caller may delete tasks for this
 * event (owner/planner only — never staff, even for their own assigned
 * task), checked against the task's *stored* eventId.
 *
 * @throws ValidationError('task_not_found') if the task does not exist
 */
export async function deleteTask(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: DeleteTaskInput
): Promise<DeleteTaskOutput> {
  const taskRef = db.collection('tasks').doc(input.taskId);
  const snapshot = await taskRef.get();
  const existing = snapshot.data() as { eventId?: string } | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('task_not_found', 'Task not found.');
  }

  const membership = await loadActiveEventMembership(db, existing.eventId, auth.uid);
  assertCanDeleteTask(membership);
  await taskRef.delete();

  return { taskId: input.taskId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleDeleteTask(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<DeleteTaskOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateDeleteTaskInput(data);
  return deleteTask(db, { uid: context.auth.uid }, input);
}
