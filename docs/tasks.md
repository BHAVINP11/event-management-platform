# Tasks

## 1. Purpose

Step 15 adds a simple event to-do list: "Book the venue," "Send
invitations," each with a due date, priority, and an optional assignee.
Unlike every other event module so far (Functions, Expenses, Vendors),
Tasks introduce the platform's **first per-row authorization split**: a
`staff` member may update — but never create or delete — a task currently
assigned to themselves, while everyone else's access is the same flat
owner/planner-manage / everyone-else-views shape used elsewhere.

## 2. Domain model

`Task` (`src/types/task.ts`):

```
id, eventId, title, description?, dueDate?,
status (todo | in_progress | completed | cancelled),
priority (low | medium | high),
assignedTo?, createdBy, createdAt, updatedAt
```

**`assignedTo` is an EventMember's user ID, never a Guest ID.** A task can
only ever be assigned to someone with a real membership in the event —
enforced server-side (see §5.1), not just a UI convention.

## 3. Repository

`TaskRepository` (`src/repositories/interfaces/taskRepository.ts`):
`getById`, `create`, `update`, `delete`, `listByEvent`.
`FirebaseTaskRepository` follows the exact shape of
`FirebaseVendorRepository`/`FirebaseExpenseRepository` — same
`RepositoryDataError`/`RepositoryInfrastructureError` conventions, same
`firestoreMapping.ts` helpers.

Collection: **`tasks/{taskId}`**, a flat top-level collection carrying an
`eventId` field — not an `events/{eventId}/tasks` subcollection,
consistent with `guests`/`functions`/`expenses`/`vendors`.

`create`/`update`/`delete` exist on the interface and Firebase
implementation for parity with the other repositories, but the client
never calls them — see §4.

## 4. Trusted CRUD

Three callable Cloud Functions, `functions/src/tasks/{createTask,
updateTask,deleteTask}.ts`, are the only way a task is ever written.
Firestore rules deny all client writes to `tasks` (see §7); reads go
through the ordinary repository/rules path instead — **reads are not
scoped by role at all**; every active event member sees every task,
regardless of who it's assigned to (only *writes* are scoped — see §5).

Every operation verifies, in this order:

1. **Authenticated** — `context.auth` present, else `unauthenticated`.
2. **Active EventMember** — the caller has an `eventMembers/{eventId}_{uid}`
   document with `status: active` for the *relevant* event (see §7 for
   what "relevant" means for update/delete). Loaded via
   `loadActiveEventMembership` — not `verifyEventManagementAuthority`,
   since Tasks (unlike Functions/Expenses/Vendors) need the caller's role
   available for a decision more nuanced than a flat owner/planner gate.
3. **Role- and assignment-based authority** —
   `functions/src/tasks/authorization.ts` decides. See §5 for the exact
   rules.

Validation (`functions/src/tasks/shared.ts`): `title` required (1–200
chars); `description` (≤2000 chars) and `dueDate` (must parse as a valid
date) are optional; `status` defaults to `todo` if omitted, else one of
the four valid values; `priority` defaults to `medium` if omitted, else
one of the three valid values. The server always derives `id`, `eventId`,
`createdBy`, and the timestamps — a client-supplied value for any of these
is silently ignored.

### 5.1 `assignedTo` is always verified against real membership

If `assignedTo` is supplied (on create or update), `createTask`/
`updateTask` call `assertAssigneeIsActiveEventMember` (also in
`functions/src/tasks/shared.ts`), which loads
`eventMembers/{eventId}_{assignedTo}` directly and throws
`invalid_assigned_to` unless that membership exists, belongs to the same
event, and is `active`. This is the same deterministic-ID lookup pattern
`loadActiveEventMembership` uses for the *caller* — reused here to verify
an *arbitrary* target user instead. A client cannot assign a task to a
Guest ID, a user with no membership at all, an inactive member, or a
member of a different event, by supplying an arbitrary string.

## 5. Authorization rules

| Role | View | Create / Delete (any task) | Update |
| --- | --- | --- | --- |
| Owner | all tasks | yes | any task |
| Planner | all tasks | yes | any task |
| Staff | all tasks | — | **only a task currently assigned to themselves** |
| Couple (bride/groom) | all tasks | — | — |
| Family | all tasks | — | — |
| Viewer | all tasks | — | — |

`functions/src/tasks/authorization.ts` defines this precisely (and
`src/features/events/services/taskAuthorization.ts` mirrors it on the
client, for UI purposes only — see §8):

- **`canCreateTask`/`canDeleteTask`** — owner/planner only, full stop.
  Staff can never create or delete a task, even one assigned to
  themselves — deleting or spinning up new tasks is a planning-authority
  action, not a "manage your own work" action.
- **`canUpdateTask(membership, callerUserId, existingAssignedTo)`** —
  owner/planner: any task, unconditionally. Staff: only if the task's
  ***stored*** `assignedTo` equals the caller's own user ID — an
  unassigned task, or one assigned to someone else, is rejected. Everyone
  else: never.

Denial codes distinguish *why*: a staff member denied because the task
isn't theirs gets `task_assignment_not_allowed` (their role generally
permits updating *their own* assigned tasks, just not this one); anyone
else is denied on *role* alone — `event_role_not_allowed`, the same code
`verifyEventManagementAuthority` uses elsewhere. This mirrors exactly how
Step 12's `guest_side_not_allowed` was split out from `event_role_not_allowed`
for the analogous reason (see `docs/guests.md` §6).

**Per the spec, this step does not let staff reassign a task to someone
else's exclusive control or restrict which fields they may change** — a
staff member editing their own assigned task can change any field
(including `assignedTo` itself, which reassigns the task, at which point
they'd no longer be able to edit it further under this rule). No
additional restriction was added beyond what the spec asked for.

## 6. Errors

`task_not_found` (→ `not-found`) and `task_assignment_not_allowed`
(→ `permission-denied`, explicit entry since it doesn't start with
`invalid_`) were added to `errorMapping.ts`. All other new codes
(`invalid_title`, `invalid_description`, `invalid_due_date`,
`invalid_status`, `invalid_priority`, `invalid_assigned_to`,
`invalid_event_id`, `invalid_task_id`) are handled by the existing
`invalid_*` → `invalid-argument` fallback rule.

## 7. Event isolation

**A member of Event A must never access tasks belonging to Event B.**

- **Reads:** the Firestore rule requires
  `isActiveEventMember(resource.data.eventId)` — the *document's own*
  `eventId`. A member of event A has no active membership document for
  event B, so the rule fails for event B's tasks regardless of what the
  client's query asks for.
- **Writes (update/delete):** authorization is checked against the task's
  ***stored*** `eventId` (loaded from the document itself), never a
  client-supplied value. An owner of event B calling
  `updateTask`/`deleteTask` with event A's `taskId` is checked against
  event A's membership requirement, which they don't have, and rejected
  with `event_access_denied`.
- **Assignment isolation:** `assertAssigneeIsActiveEventMember` checks the
  assignee's membership against *this* event's ID specifically — a staff
  member of event B cannot be assigned a task on event A, even if an
  owner of event A tries to, because no `eventMembers/{eventA}_{staffB}`
  document exists.

All covered by
`functions/src/__tests__/{createTask,updateTask,deleteTask}.test.ts`.

## 8. Tasks page

`/events/:eventId/tasks` (`TasksPage`), reached from a **Tasks** item in
the event workspace navigation. Uses the same access check as the
workspace Overview before showing anything.

- Tasks are shown as simple cards: title, description, due date, priority,
  assigned person, status.
- `[All] [To Do] [In Progress] [Completed] [Cancelled]` status filter tabs
  run client-side over the already-loaded (unscoped) list.
- **Add** (`[+ Add Task]`) is offered only when `canManageAll` is true
  (owner/planner).
- **Edit** and **Mark Complete** are offered per-row via the client-side
  `canUpdateTask(currentUserRole, currentUserId, task)` mirror — true for
  owner/planner always, true for staff only when `task.assignedTo` is
  their own ID. **Delete** is offered only when `canManageAll` is true —
  staff never sees a Delete button, even for their own task.
  createTask/updateTask/deleteTask independently re-verify all of this
  server-side regardless of what the page shows.
- **Assigned To** (in `TaskForm`) only ever lists `assignableMembers` —
  active EventMembers of this event, resolved via `TaskService` (see §8.1)
  — never Guests, and never inactive/other-event members.
- **Delete** asks for confirmation (`window.confirm`) before calling
  `deleteTask` — no custom modal component introduced for one destructive
  action.
- **UI states**: loading (`LoadingSkeleton`), denied/not-found (the same
  `resource-notice` pattern as the rest of the workspace), error
  (`ErrorState`, friendly message + Retry — `TaskError`/`EventLoadError`
  carry only a friendly message, never a Firestore code or stack trace),
  and two distinct empty states: "No tasks added yet." vs. "No tasks match
  this filter."

### 8.1 Known limitation: assignee display names

`TaskService.listTasks` composes `EventPeopleService.listPeople` (rather
than reading `EventMemberRepository` directly) to build both the
"Assigned To" dropdown and the read-only "Assigned Person" label, so this
reuses — rather than duplicates — the People page's existing name
resolution. That resolution has a real constraint, inherited unchanged
from the People page (see `docs/events.md` and `EventPeopleService`
itself): **Firestore rules only let a user read their own `users/{userId}`
profile**, so a member's display name is only ever resolvable for the
*current* viewer's own row. Every other member falls back to a
role-based label (e.g. "Staff", "Bride") instead of a name — meaning two
unnamed staff members assigned to different tasks would show identically
as "Staff" in the list and the assignment dropdown, indistinguishable by
name alone. This is not a bug introduced by this step; it is the same
tradeoff the People page already made, reused here rather than
independently re-solved (which would mean widening the `users` collection
read rule — a real security decision this step does not make casually).
Future possibilities for narrowing this are noted in §9.

## 9. Future possibilities

Once there's real planner feedback to design against: a proper
member-name directory scoped to co-members of a shared event (resolving
the §8.1 limitation deliberately, not as a side effect), task comments,
file attachments, recurring tasks, due-date reminders/notifications, a
calendar or Gantt view, and letting staff reassign their own tasks to
someone else without losing edit access. None of these are hinted at in
the current schema.

## 10. Non-goals (explicitly out of scope for this step)

Task notifications, email/SMS/WhatsApp, recurring tasks, calendar
integration, Gantt charts, task comments, file attachments, chat, a
generic permission engine, and an admin panel. None of these were
implemented, and no scaffolding for them (fields, flags, empty modules)
was added.

## 11. Architecture

Same shape as Vendors/Expenses/Functions, with one addition —
`TaskService` depends on `EventPeopleService` to resolve assignee display
labels rather than re-deriving that logic:

```
Tasks page → TaskService (read)  → Repository Interfaces / EventPeopleService → Firebase Repositories → Firestore
Add/Edit/Del/Complete → TaskService (write) → Callable Cloud Functions       → Admin SDK             → Firestore
```

`TaskService` (`src/features/events/services/taskService.ts`) handles both
reads and writes, mirroring `VendorService`/`ExpenseService`/
`FunctionService`. React components never import Firestore or a Firebase
repository; `useTaskList` (hook) and `TaskForm`/`TaskList` (components)
only ever talk to `TaskService`.

## Structure

```
functions/src/shared/eventAuthority.ts   loadActiveEventMembership (role, reused as-is)
functions/src/tasks/
  authorization.ts      canCreate/Update/DeleteTask, assertCan* (owner/planner + staff-own-task rule)
  shared.ts             field validation, assertAssigneeIsActiveEventMember, Task document builder
  createTask.ts         loadActiveEventMembership, assertCanCreateTask, verify assignedTo, create
  updateTask.ts         loads existing, loadActiveEventMembership, assertCanUpdateTask(existing.assignedTo), verify assignedTo, update
  deleteTask.ts         loads existing, loadActiveEventMembership, assertCanDeleteTask, delete

src/types/task.ts                                   Task, TaskStatus, TaskPriority
src/repositories/interfaces/taskRepository.ts
src/services/firebase/repositories/firebaseTaskRepository.ts

src/features/events/
  types/tasks.ts                     TaskListData, AssignableMember, TaskFormInput
  services/taskAuthorization.ts      canManageAllTasks, canUpdateTask (client-side mirror, UI only)
  services/taskService.ts            read (repository + EventPeopleService) + write (Cloud Functions)
  hooks/useTaskList.ts
  components/TaskList.tsx             per-row canEdit/canDelete, Mark Complete
  components/TaskForm.tsx             Assigned To limited to assignableMembers
  pages/TasksPage.tsx                  /events/:eventId/tasks
```
