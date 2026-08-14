"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateTaskInput = validateUpdateTaskInput;
exports.updateTask = updateTask;
exports.handleUpdateTask = handleUpdateTask;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const authorization_1 = require("./authorization");
const shared_1 = require("./shared");
function validateUpdateTaskInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.taskId || typeof obj.taskId !== 'string') {
        throw new validation_1.ValidationError('invalid_task_id', 'taskId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateTaskFields)(obj);
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
async function updateTask(db, auth, input) {
    const taskRef = db.collection('tasks').doc(input.taskId);
    const snapshot = await taskRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('task_not_found', 'Task not found.');
    }
    const membership = await (0, eventAuthority_1.loadActiveEventMembership)(db, existing.eventId, auth.uid);
    (0, authorization_1.assertCanUpdateTask)(membership, auth.uid, existing.assignedTo);
    if (input.assignedTo !== undefined) {
        await (0, shared_1.assertAssigneeIsActiveEventMember)(db, existing.eventId, input.assignedTo);
    }
    const now = new Date().toISOString();
    await taskRef.set((0, shared_1.buildTaskDocument)(input.taskId, existing.eventId, existing.createdBy ?? auth.uid, input, existing.createdAt ?? now, now));
    return { taskId: input.taskId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateTask(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateTaskInput(data);
    return updateTask(db, { uid: context.auth.uid }, input);
}
