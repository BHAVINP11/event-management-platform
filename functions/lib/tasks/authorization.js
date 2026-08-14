"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canCreateTask = canCreateTask;
exports.canDeleteTask = canDeleteTask;
exports.canUpdateTask = canUpdateTask;
exports.assertCanCreateTask = assertCanCreateTask;
exports.assertCanDeleteTask = assertCanDeleteTask;
exports.assertCanUpdateTask = assertCanUpdateTask;
/**
 * Task access scoping.
 *
 * A small, task-specific authorization helper — not a generic permission
 * engine. Owner/planner may create/update/delete any task. Staff may view
 * every task (like everyone else) but may only update a task that is
 * currently assigned to them, and may never create or delete a task.
 * Bride/groom/family/viewer are view-only.
 */
const validation_1 = require("../validation");
const FULL_ACCESS_ROLES = ['owner', 'planner'];
const STAFF_ROLE = 'staff';
/** Whether the membership may create a task at all. Owner/planner only. */
function canCreateTask(membership) {
    return FULL_ACCESS_ROLES.includes(membership.role);
}
/** Whether the membership may delete a task at all. Owner/planner only. */
function canDeleteTask(membership) {
    return FULL_ACCESS_ROLES.includes(membership.role);
}
/**
 * Whether the membership may update a task currently assigned to
 * `existingAssignedTo`. Owner/planner may update any task; staff may only
 * update a task already assigned to themselves (`callerUserId`);
 * bride/groom/family/viewer may never update.
 */
function canUpdateTask(membership, callerUserId, existingAssignedTo) {
    if (FULL_ACCESS_ROLES.includes(membership.role)) {
        return true;
    }
    if (membership.role === STAFF_ROLE) {
        return existingAssignedTo !== undefined && existingAssignedTo === callerUserId;
    }
    return false;
}
function assertCanCreateTask(membership) {
    if (!canCreateTask(membership)) {
        throw new validation_1.ValidationError('event_role_not_allowed', 'Your role does not allow creating tasks for this event.');
    }
}
function assertCanDeleteTask(membership) {
    if (!canDeleteTask(membership)) {
        throw new validation_1.ValidationError('event_role_not_allowed', 'Your role does not allow deleting tasks for this event.');
    }
}
/**
 * Staff denied because the task isn't assigned to them get
 * `task_assignment_not_allowed` — their role generally permits updating
 * *their own* assigned tasks, just not this one. Anyone else (bride/
 * groom/family/viewer) is denied on *role* alone —
 * `event_role_not_allowed`, the same code `verifyEventManagementAuthority`
 * uses for that case.
 */
function assertCanUpdateTask(membership, callerUserId, existingAssignedTo) {
    if (canUpdateTask(membership, callerUserId, existingAssignedTo)) {
        return;
    }
    if (membership.role === STAFF_ROLE) {
        throw new validation_1.ValidationError('task_assignment_not_allowed', 'You may only update tasks assigned to you.');
    }
    throw new validation_1.ValidationError('event_role_not_allowed', 'Your role does not allow updating tasks for this event.');
}
