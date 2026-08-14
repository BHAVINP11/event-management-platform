import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { loadActiveEventMembership } from '../shared/eventAuthority';
import { assertCanUpdateTask } from './authorization';
import { TaskFields, assertAssigneeIsActiveEventMember, buildTaskDocument, validateTaskFields } from './shared';

export interface UpdateTaskInput extends TaskFields {
  taskId: string;
}

export interface UpdateTaskOutput {
  taskId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingTaskData {
  eventId?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
}

export function validateUpdateTaskInput(input: unknown): UpdateTaskInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.taskId || typeof obj.taskId !== 'string') {
    throw new ValidationError('invalid_task_id', 'taskId must be a non-empty string.');
  }

  const fields = validateTaskFields(obj);

  return { taskId: obj.taskId, ...fields };
}

/**
 * Updates a task after verifying the caller may update it: authority is
 * checked against the task's *stored* eventId and *stored* assignedTo —
 * never a client-supplied value, so a client cannot retarget an edit at a
 * different event's task, and a staff member cannot claim a task assigned
 * to someone else was already theirs to edit. Owner/planner may update any
 * task; staff only a task currently assigned to themselves (see
 * `functions/src/tasks/authorization.ts`). If `assignedTo` is supplied (or
 * being changed), it must be an active EventMember of the same event.
 * `id`, `eventId`, `createdBy`, and `createdAt` are carried over from the
 * existing document regardless of what the client sends.
 *
 * @throws ValidationError('task_not_found') if the task does not exist
 */
export async function updateTask(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateTaskInput
): Promise<UpdateTaskOutput> {
  const taskRef = db.collection('tasks').doc(input.taskId);
  const snapshot = await taskRef.get();
  const existing = snapshot.data() as ExistingTaskData | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('task_not_found', 'Task not found.');
  }

  const membership = await loadActiveEventMembership(db, existing.eventId, auth.uid);
  assertCanUpdateTask(membership, auth.uid, existing.assignedTo);

  if (input.assignedTo !== undefined) {
    await assertAssigneeIsActiveEventMember(db, existing.eventId, input.assignedTo);
  }

  const now = new Date().toISOString();
  await taskRef.set(
    buildTaskDocument(
      input.taskId,
      existing.eventId,
      existing.createdBy ?? auth.uid,
      input,
      existing.createdAt ?? now,
      now
    )
  );

  return { taskId: input.taskId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateTask(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateTaskOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateTaskInput(data);
  return updateTask(db, { uid: context.auth.uid }, input);
}
