import { CallableAuthContext } from '../shared/callableContext';
export interface DeleteTaskInput {
    taskId: string;
}
export interface DeleteTaskOutput {
    taskId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateDeleteTaskInput(input: unknown): DeleteTaskInput;
/**
 * Deletes a task after verifying the caller may delete tasks for this
 * event (owner/planner only — never staff, even for their own assigned
 * task), checked against the task's *stored* eventId.
 *
 * @throws ValidationError('task_not_found') if the task does not exist
 */
export declare function deleteTask(db: FirebaseFirestore.Firestore, auth: AuthContext, input: DeleteTaskInput): Promise<DeleteTaskOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleDeleteTask(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<DeleteTaskOutput>;
export {};
