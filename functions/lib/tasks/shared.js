"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_PRIORITIES = exports.TASK_STATUSES = void 0;
exports.validateTaskFields = validateTaskFields;
exports.assertAssigneeIsActiveEventMember = assertAssigneeIsActiveEventMember;
exports.buildTaskDocument = buildTaskDocument;
/**
 * Shared building blocks for task management.
 *
 * createTask and updateTask both validate the same fields and build the
 * same document shape, so both live here rather than being duplicated.
 */
const validation_1 = require("../validation");
const membershipIds_1 = require("../shared/membershipIds");
exports.TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'];
exports.TASK_PRIORITIES = ['low', 'medium', 'high'];
const TITLE_MIN = 1;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
function validateTitle(title) {
    if (!title || typeof title !== 'string') {
        throw new validation_1.ValidationError('invalid_title', 'Title must be a non-empty string.');
    }
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
        throw new validation_1.ValidationError('invalid_title', `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`);
    }
    return title;
}
function validateDescription(description) {
    if (description === undefined || description === null) {
        return undefined;
    }
    if (typeof description !== 'string') {
        throw new validation_1.ValidationError('invalid_description', 'Description must be a string.');
    }
    if (description.length > DESCRIPTION_MAX) {
        throw new validation_1.ValidationError('invalid_description', `Description must be at most ${DESCRIPTION_MAX} characters.`);
    }
    return description;
}
function validateDueDate(dueDate) {
    if (dueDate === undefined || dueDate === null) {
        return undefined;
    }
    if (typeof dueDate !== 'string' || isNaN(new Date(dueDate).getTime())) {
        throw new validation_1.ValidationError('invalid_due_date', 'Due date must be a valid date string.');
    }
    return dueDate;
}
function validateStatus(status) {
    if (status === undefined || status === null) {
        return 'todo';
    }
    if (typeof status !== 'string' || !exports.TASK_STATUSES.includes(status)) {
        throw new validation_1.ValidationError('invalid_status', `Status must be one of: ${exports.TASK_STATUSES.join(', ')}`);
    }
    return status;
}
function validatePriority(priority) {
    if (priority === undefined || priority === null) {
        return 'medium';
    }
    if (typeof priority !== 'string' || !exports.TASK_PRIORITIES.includes(priority)) {
        throw new validation_1.ValidationError('invalid_priority', `Priority must be one of: ${exports.TASK_PRIORITIES.join(', ')}`);
    }
    return priority;
}
function validateAssignedTo(assignedTo) {
    if (assignedTo === undefined || assignedTo === null) {
        return undefined;
    }
    if (typeof assignedTo !== 'string' || assignedTo.length === 0) {
        throw new validation_1.ValidationError('invalid_assigned_to', 'assignedTo must be a non-empty string.');
    }
    return assignedTo;
}
/** Validates the fields common to task creation and editing (format only). Throws ValidationError. */
function validateTaskFields(obj) {
    const title = validateTitle(obj.title);
    const description = validateDescription(obj.description);
    const dueDate = validateDueDate(obj.dueDate);
    const status = validateStatus(obj.status);
    const priority = validatePriority(obj.priority);
    const assignedTo = validateAssignedTo(obj.assignedTo);
    return { title, description, dueDate, status, priority, assignedTo };
}
/**
 * Verifies that `assignedTo`, if supplied, is an active EventMember of
 * `eventId` — never trusted as a bare user ID. Requires a real Firestore
 * lookup (unlike the rest of `validateTaskFields`), so it lives here as a
 * separate async step rather than folded into the pure field validator.
 *
 * A client cannot assign a task to a user outside the event, or to a user
 * whose membership is inactive, by supplying an arbitrary uid.
 */
async function assertAssigneeIsActiveEventMember(db, eventId, assignedTo) {
    const membershipId = (0, membershipIds_1.getEventMembershipId)(eventId, assignedTo);
    const snapshot = await db.collection('eventMembers').doc(membershipId).get();
    const membership = snapshot.data();
    if (!snapshot.exists ||
        !membership ||
        membership.eventId !== eventId ||
        membership.userId !== assignedTo ||
        membership.status !== 'active') {
        throw new validation_1.ValidationError('invalid_assigned_to', 'assignedTo must be an active member of this event.');
    }
}
/**
 * Builds a Firestore task document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createTask passes the
 * authenticated uid and "now"; updateTask passes the existing document's
 * values, so an edit can never change who created it or when. Optional
 * fields are omitted rather than stored as `undefined`.
 */
function buildTaskDocument(taskId, eventId, createdBy, fields, createdAt, updatedAt) {
    const doc = {
        id: taskId,
        eventId,
        title: fields.title,
        status: fields.status,
        priority: fields.priority,
        createdBy,
        createdAt,
        updatedAt
    };
    if (fields.description !== undefined) {
        doc.description = fields.description;
    }
    if (fields.dueDate !== undefined) {
        doc.dueDate = fields.dueDate;
    }
    if (fields.assignedTo !== undefined) {
        doc.assignedTo = fields.assignedTo;
    }
    return doc;
}
