"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateTaskInput = validateCreateTaskInput;
exports.createTask = createTask;
exports.handleCreateTask = handleCreateTask;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const authorization_1 = require("./authorization");
const shared_1 = require("./shared");
function validateCreateTaskInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateTaskFields)(obj);
    return { eventId: obj.eventId, ...fields };
}
/**
 * Creates a task after verifying the caller may create tasks for this
 * event (owner/planner only). If `assignedTo` is supplied, it must be an
 * active EventMember of the same event — never trusted as a bare user ID.
 * The client never chooses `id`, `createdBy`, or the timestamps.
 */
async function createTask(db, auth, input) {
    const userId = auth.uid;
    const membership = await (0, eventAuthority_1.loadActiveEventMembership)(db, input.eventId, userId);
    (0, authorization_1.assertCanCreateTask)(membership);
    if (input.assignedTo !== undefined) {
        await (0, shared_1.assertAssigneeIsActiveEventMember)(db, input.eventId, input.assignedTo);
    }
    const now = new Date().toISOString();
    const taskRef = db.collection('tasks').doc();
    const taskId = taskRef.id;
    await taskRef.set((0, shared_1.buildTaskDocument)(taskId, input.eventId, userId, input, now, now));
    return { taskId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleCreateTask(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateTaskInput(data);
    return createTask(db, { uid: context.auth.uid }, input);
}
