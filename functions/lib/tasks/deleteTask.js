"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeleteTaskInput = validateDeleteTaskInput;
exports.deleteTask = deleteTask;
exports.handleDeleteTask = handleDeleteTask;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const authorization_1 = require("./authorization");
function validateDeleteTaskInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.taskId || typeof obj.taskId !== 'string') {
        throw new validation_1.ValidationError('invalid_task_id', 'taskId must be a non-empty string.');
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
async function deleteTask(db, auth, input) {
    const taskRef = db.collection('tasks').doc(input.taskId);
    const snapshot = await taskRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('task_not_found', 'Task not found.');
    }
    const membership = await (0, eventAuthority_1.loadActiveEventMembership)(db, existing.eventId, auth.uid);
    (0, authorization_1.assertCanDeleteTask)(membership);
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
async function handleDeleteTask(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateDeleteTaskInput(data);
    return deleteTask(db, { uid: context.auth.uid }, input);
}
