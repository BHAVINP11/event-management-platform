import { CallableAuthContext } from '../shared/callableContext';
import { TaskFields } from './shared';
export interface UpdateTaskInput extends TaskFields {
    taskId: string;
}
export interface UpdateTaskOutput {
    taskId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateTaskInput(input: unknown): UpdateTaskInput;
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
export declare function updateTask(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateTaskInput): Promise<UpdateTaskOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateTask(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateTaskOutput>;
export {};
