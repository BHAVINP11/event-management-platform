# Functions / Ceremonies

## 1. Purpose

Step 13 adds the platform's second real event module: **Functions**, the
sub-events that make up an Event. A wedding Event is rarely one single
occasion — it is a sequence of them:

```
Bhavin & Priya Wedding
  ├── Mehndi      12 Feb 2027, Royal Palace
  ├── Haldi       13 Feb 2027, Family Home
  ├── Sangeet     14 Feb 2027, Grand Hall
  ├── Wedding     15 Feb 2027, Royal Palace
  └── Reception   16 Feb 2027, Garden Venue
```

**A Function belongs to exactly one Event.** This step is deliberately
simple: a Function is a named ceremony with an optional date/time/venue and
a status, nothing more. It does not touch guests, invitations, or any other
domain — those relationships (which guests attend which function, RSVPs,
seating, etc.) are explicitly out of scope; see §10.

## 2. Domain model

`EventFunction` (`src/types/eventFunction.ts`) — named `EventFunction`
rather than the bare `Function`, which would shadow TypeScript's built-in
`Function` type:

```
id, eventId, name, description?, date?, startTime?, endTime?, venue?, notes?,
status (planned | confirmed | completed | cancelled),
createdBy, createdAt, updatedAt
```

`date` is a simple date string; `startTime`/`endTime` are simple 24-hour
`"HH:MM"` strings. No timezone handling, recurrence, or calendar
infrastructure — see §10.

## 3. Repository

`FunctionRepository` (`src/repositories/interfaces/functionRepository.ts`):
`getById`, `create`, `update`, `delete`, `listByEvent`.
`FirebaseFunctionRepository` follows the exact shape of
`FirebaseGuestRepository` — same `RepositoryDataError`/
`RepositoryInfrastructureError` conventions, same `firestoreMapping.ts`
helpers for enum/optional-field mapping.

Collection: **`functions/{functionId}`**, a flat top-level collection
carrying an `eventId` field — not an `events/{eventId}/functions`
subcollection, consistent with `guests`/`eventMembers`/`invitations`.

The backend source lives at `functions/src/ceremonies/` rather than
`functions/src/functions/` — the latter would be a confusing name inside a
Node project whose top-level `functions/` directory *is* the Cloud
Functions package. The Firestore collection and the domain concept are
still both literally called "function"; only the backend folder is named
`ceremonies` to avoid the collision.

`create`/`update`/`delete` exist on the interface and Firebase
implementation for parity with the other repositories, but the client never
calls them — see §4.

## 4. Trusted CRUD

Three callable Cloud Functions, `functions/src/ceremonies/{createFunction,
updateFunction,deleteFunction}.ts`, are the only way a Function is ever
written. Firestore rules deny all client writes to `functions` (see §7);
reads go through the ordinary repository/rules path instead.

Every operation verifies, in this order:

1. **Authenticated** — `context.auth` present, else `unauthenticated`.
2. **Active EventMember** — the caller has an `eventMembers/{eventId}_{uid}`
   document with `status: active` for the *relevant* event (see §7 for what
   "relevant" means for update/delete).
3. **Management role** — `verifyEventManagementAuthority`
   (`functions/src/shared/eventAuthority.ts`) throws
   `event_role_not_allowed` unless the caller's role is `owner` or
   `planner`. This is the exact same plain owner/planner gate used by
   `createInvitation` (Step 10) — Functions have no side-scoping, unlike
   guests (Step 12), so no new authorization module was needed.

Validation (`functions/src/ceremonies/shared.ts`) mirrors
`functions/src/guests/shared.ts`'s structure: `name` is required (1–200
chars); `description` (≤2000), `venue` (≤200), and `notes` (≤1000) are
optional bounded strings; `date` must parse as a valid date if present;
`startTime`/`endTime` must each match `HH:MM` (24-hour) if present; if
**both** are supplied, `endTime` earlier than `startTime` is rejected
(`invalid_time_range`) — equal start/end is allowed, matching the
"cannot be before" semantics `validateEndDate` already uses elsewhere in
this codebase. `status` defaults to `planned` if omitted, else must be one
of the four valid values. The server always derives `id`, `eventId`,
`createdBy`, and the timestamps — a client-supplied value for any of these
is silently ignored.

## 5. Authorization rules

| Role | View | Create / Update / Delete |
| --- | --- | --- |
| Owner | all functions | yes |
| Planner | all functions | yes |
| Couple (bride/groom) | all functions | — (view only) |
| Family | all functions | — (view only) |
| Staff | all functions | — (view only) |
| Viewer | all functions | — (view only) |

Unlike guests, there is **no side-scoping** for this domain — every active
event member sees every function for that event; only who may *manage*
them differs. Per the spec, function-specific/granular permissions
(e.g. a couple member managing only their own function) are explicitly not
implemented in this step — see §10.

## 6. Errors

`function_not_found` (→ `not-found`) — the requested `functionId` does not
exist, used by `updateFunction`/`deleteFunction`. All other new codes
(`invalid_name`, `invalid_description`, `invalid_date`, `invalid_start_time`,
`invalid_end_time`, `invalid_time_range`, `invalid_venue`, `invalid_notes`,
`invalid_status`, `invalid_event_id`, `invalid_function_id`) are handled by
`errorMapping.ts`'s existing `invalid_*` → `invalid-argument` fallback rule,
with no new entries required.

## 7. Event isolation

**A member of Event A must never access Functions belonging to Event B.**

- **Reads:** the Firestore rule requires
  `isActiveEventMember(resource.data.eventId)` — the *document's own*
  `eventId`, not one the client asserts. A member of event A has no active
  membership document for event B, so the rule fails for event B's
  functions regardless of what the client's query asks for.
- **Writes (update/delete):** authorization is checked against the
  function's ***stored*** `eventId` (loaded from the document itself),
  never a client-supplied value. An owner of event B calling
  `updateFunction`/`deleteFunction` with event A's `functionId` is checked
  against event A's membership requirement, which they don't have, and
  rejected with `event_access_denied`. Covered by
  `functions/src/__tests__/{createFunction,updateFunction,deleteFunction}.test.ts`
  (`"an owner of a different event cannot ... this event's function"`).

## 8. Functions page

`/events/:eventId/functions` (`FunctionsPage`), reached from a **Functions**
item in the event workspace navigation (alongside **Overview**, **People**,
and **Guests**). Uses the same access check as the workspace Overview
before showing anything.

- Functions are shown as simple cards: name, date, time range, venue,
  status — e.g. "Mehndi / 12 Feb 2027 / Royal Palace / Planned". No
  calendar view, grouping, or sorting beyond Firestore's natural
  `listByEvent` order.
- **Add/Edit** is one shared `FunctionForm`, shown inline (toggled, not a
  separate route) — Name, Description, Date, Start Time, End Time, Venue,
  Notes, Status. Only rendered when `canManage` is true (owner/planner).
  `createFunction`/`updateFunction` independently re-verify the role
  server-side regardless of what the form shows.
- **Delete** asks for confirmation (`window.confirm`) before calling
  `deleteFunction` — no custom modal component introduced for one
  destructive action.

## 9. UI states

Loading (`LoadingSkeleton`), denied/not-found (the same `resource-notice`
pattern as Guests/People/Overview), error (`ErrorState`, friendly message +
Retry — `FunctionError`/`EventLoadError` carry only a friendly message,
never a Firestore code or stack trace), and the empty state: "No functions
added yet." (plus `[+ Add Function]` for owner/planner).

## 10. Non-goals (explicitly out of scope for this step)

Guest assignment to functions, RSVP, invitations, seating,
attendance/check-in, expenses, vendors, tasks, notifications
(WhatsApp/SMS/email), recurring functions, calendar integrations, granular
per-function permissions (e.g. a couple member managing only their own
function), and an admin panel. None of these were implemented, and no
scaffolding for them (fields, flags, empty modules) was added — following
the same "don't design for hypothetical future requirements" reasoning
applied throughout this project (see `docs/guests.md` §10 for a worked
example of the same discipline).

The eventual guest ↔ function relationship (Step 10's non-goals list
already flagged this as future work) will most likely be a join collection
or a `functionIds` field on `Guest`, decided when that step is actually
designed — not guessed at here.

## 11. Architecture

Same shape as Guests (Step 11–12):

```
Functions page → FunctionService (read)  → Repository Interfaces      → Firebase Repositories → Firestore
Add/Edit/Del   → FunctionService (write) → Callable Cloud Functions   → Admin SDK             → Firestore
```

`FunctionService` (`src/features/events/services/functionService.ts`) is
one class handling both reads and writes, mirroring `GuestService`. React
components never import Firestore or a Firebase repository; `useFunctionList`
(hook) and `FunctionForm`/`FunctionList` (components) only ever talk to
`FunctionService`.

## Structure

```
functions/src/shared/eventAuthority.ts   verifyEventManagementAuthority (owner/planner only, reused as-is)
functions/src/ceremonies/
  shared.ts             field validation (incl. time-range check), EventFunction document builder
  createFunction.ts     verifyEventManagementAuthority, create
  updateFunction.ts     loads existing, verifyEventManagementAuthority(existing.eventId), update
  deleteFunction.ts     loads existing, verifyEventManagementAuthority(existing.eventId), delete

src/types/eventFunction.ts                          EventFunction, EventFunctionStatus
src/repositories/interfaces/functionRepository.ts
src/services/firebase/repositories/firebaseFunctionRepository.ts

src/features/events/
  types/functions.ts                 FunctionListData, FunctionFormInput
  services/functionService.ts        read (repository) + write (Cloud Functions)
  hooks/useFunctionList.ts
  components/FunctionList.tsx
  components/FunctionForm.tsx
  pages/FunctionsPage.tsx             /events/:eventId/functions
```
