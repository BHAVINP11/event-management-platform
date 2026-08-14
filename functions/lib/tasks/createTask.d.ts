import { CallableAuthContext } from '../shared/callableContext';
import { TaskFields } from './shared';
export interface CreateTaskInput extends TaskFields {
    eventId: string;
}
export interface CreateTaskOutput {
    taskId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCreateTaskInput(input: unknown): CreateTaskInput;
/**
 * Creates a task after verifying the caller may create tasks for this
 * event (owner/planner only). If `assignedTo` is supplied, it must be an
 * active EventMember of the same event — never trusted as a bare user ID.
 * The client never chooses `id`, `createdBy`, or the timestamps.
 */
export declare function createTask(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateTaskInput): Promise<CreateTaskOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateTask(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateTaskOutput>;
export {};
