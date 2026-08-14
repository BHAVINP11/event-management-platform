export declare const TASK_STATUSES: readonly ["todo", "in_progress", "completed", "cancelled"];
export declare const TASK_PRIORITIES: readonly ["low", "medium", "high"];
export interface TaskFields {
    title: string;
    description?: string;
    dueDate?: string;
    status: string;
    priority: string;
    assignedTo?: string;
}
/** Validates the fields common to task creation and editing (format only). Throws ValidationError. */
export declare function validateTaskFields(obj: Record<string, unknown>): TaskFields;
/**
 * Verifies that `assignedTo`, if supplied, is an active EventMember of
 * `eventId` — never trusted as a bare user ID. Requires a real Firestore
 * lookup (unlike the rest of `validateTaskFields`), so it lives here as a
 * separate async step rather than folded into the pure field validator.
 *
 * A client cannot assign a task to a user outside the event, or to a user
 * whose membership is inactive, by supplying an arbitrary uid.
 */
export declare function assertAssigneeIsActiveEventMember(db: FirebaseFirestore.Firestore, eventId: string, assignedTo: string): Promise<void>;
/**
 * Builds a Firestore task document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createTask passes the
 * authenticated uid and "now"; updateTask passes the existing document's
 * values, so an edit can never change who created it or when. Optional
 * fields are omitted rather than stored as `undefined`.
 */
export declare function buildTaskDocument(taskId: string, eventId: string, createdBy: string, fields: TaskFields, createdAt: string, updatedAt: string): Record<string, unknown>;
