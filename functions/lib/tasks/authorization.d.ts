export interface TaskMembership {
    role: string;
}
/** Whether the membership may create a task at all. Owner/planner only. */
export declare function canCreateTask(membership: TaskMembership): boolean;
/** Whether the membership may delete a task at all. Owner/planner only. */
export declare function canDeleteTask(membership: TaskMembership): boolean;
/**
 * Whether the membership may update a task currently assigned to
 * `existingAssignedTo`. Owner/planner may update any task; staff may only
 * update a task already assigned to themselves (`callerUserId`);
 * bride/groom/family/viewer may never update.
 */
export declare function canUpdateTask(membership: TaskMembership, callerUserId: string, existingAssignedTo: string | undefined): boolean;
export declare function assertCanCreateTask(membership: TaskMembership): void;
export declare function assertCanDeleteTask(membership: TaskMembership): void;
/**
 * Staff denied because the task isn't assigned to them get
 * `task_assignment_not_allowed` — their role generally permits updating
 * *their own* assigned tasks, just not this one. Anyone else (bride/
 * groom/family/viewer) is denied on *role* alone —
 * `event_role_not_allowed`, the same code `verifyEventManagementAuthority`
 * uses for that case.
 */
export declare function assertCanUpdateTask(membership: TaskMembership, callerUserId: string, existingAssignedTo: string | undefined): void;
