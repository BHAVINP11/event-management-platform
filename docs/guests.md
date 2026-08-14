# Guest Management

## 1. Purpose

Step 11 adds the platform's first real event module: a guest list.

A **Guest is an event attendee, not a platform User.** They need no account,
login, or profile — just a name and whatever contact/relationship details the
event's planner or owner chooses to record:

```
Rajesh Patel
Side: bride
Relation: Uncle
```

This deliberately does not touch anything about `User`, `EventMember`, or
invitations (Steps 4–10) — a guest and a collaborator are different concepts,
even though both eventually relate to an `Event`.

## 2. Domain model

`Guest` (`src/types/guest.ts`):

```
id, eventId, name, phone?, email?, side, relation?, notes?,
status (pending | invited | confirmed | declined),
createdBy, createdAt, updatedAt
```

`side` uses its own enum, `GuestSide` (`bride | groom | both`) — not
`EventMemberSide` (`bride | groom`), since a guest can belong to *both* sides
in a way an `EventMember`'s role never does (an invited collaborator plays
one role; a guest can simply be "family of both").

No other domain model changed.

## 3. Repository

`GuestRepository` (`src/repositories/interfaces/guestRepository.ts`):
`getById`, `create`, `update`, `delete`, `listByEvent`, `listByEventAndSide`.
`FirebaseGuestRepository` follows the exact shape of
`FirebaseEventMemberRepository`/`FirebaseInvitationRepository` — same
`RepositoryDataError`/`RepositoryInfrastructureError` conventions, same
`firestoreMapping.ts` helpers for enum/optional-field mapping.

Collection: **`guests/{guestId}`**, a flat top-level collection carrying an
`eventId` field — not an `events/{eventId}/guests` subcollection. This
matches how `eventMembers` and `invitations` are already structured, and is
what lets a single `where('eventId', '==', ...)` query (and a single
Firestore rule) scope access, consistent with the rest of the app.

`create`/`update`/`delete` exist on the interface and Firebase
implementation for parity with the other repositories, but the client never
calls them — see §4.

## 4. Trusted CRUD

Three callable Cloud Functions, `functions/src/guests/{createGuest,
updateGuest,deleteGuest}.ts`, are the only way a guest is ever written.
Firestore rules deny all client writes to `guests` (see §7); reads go
through the ordinary repository/rules path instead (any active event
member, regardless of role — see §5).

Every operation verifies, in this order:

1. **Authenticated** — `context.auth` present, else `unauthenticated`.
2. **Active EventMember** — the caller has an `eventMembers/{eventId}_{uid}`
   document with `status: active` for the *relevant* event (see §6 for what
   "relevant" means for update/delete).
3. **Role** — `owner` or `planner`; anyone else gets `event_role_not_allowed`.

This authorization check (`verifyEventManagementAuthority`,
`functions/src/shared/eventAuthority.ts`) is not new code written for
guests — it's the exact same "is this caller an active owner/planner on
this event" check `createInvitation` (Step 10) already needed, extracted
into a shared helper so the two features can't drift apart. `createGuest`,
`updateGuest`, and `deleteGuest` all call it; `createInvitation` was
refactored to call it too, with no change in its behavior or error codes.

## 5. Who can do what (current step, not final)

| Role | View guests | Add / edit / delete |
| --- | --- | --- |
| Owner | ✅ | ✅ |
| Planner | ✅ | ✅ |
| Couple | ✅ | ❌ |
| Family | ✅ | ❌ |
| Staff | ✅ | ❌ |
| Viewer | ✅ | ❌ |

Viewing is granted by Firestore rules to **any active member, regardless of
role** — the same "collaborative visibility" precedent Step 10 set for the
People page. Only the Cloud Functions restrict *writing* to owner/planner.
The client's `GuestService.listGuests().canManage` (backed by
`AuthorizationService.canManageEventGuests`) only decides whether the UI
offers Add/Edit/Delete; it is not consulted by the Cloud Functions, which
independently re-derive the same owner/planner check from the stored
membership document.

## 6. Validation and what the server controls

`functions/src/guests/shared.ts` validates:

- `name`: required, 1–200 characters.
- `phone`: optional, ≤30 characters.
- `email`: optional — reuses `validateContactEmail` from
  `functions/src/validation.ts` rather than a second email regex.
- `side`: required, one of `bride` / `groom` / `both`.
- `relation`: optional, ≤100 characters.
- `notes`: optional, ≤1000 characters.
- `status`: optional, defaults to `pending`; if given, one of `pending` /
  `invited` / `confirmed` / `declined`.

The server — never the client — controls `id` (auto-generated Firestore doc
ID), `eventId`, `createdBy`, `createdAt`, and `updatedAt`:

- **createGuest** takes `eventId` from the request, but only to *look up*
  the caller's membership (§4) — the stored document's `eventId` is what
  `createGuest` writes, and `createdBy` is always `context.auth.uid`.
- **updateGuest** takes only `guestId` from the request. It loads the
  *existing* document first and carries its `eventId`, `createdBy`, and
  `createdAt` forward untouched, regardless of anything the client sends in
  those fields — there is no code path where a client-supplied `eventId`
  reaches storage during an update.

## 7. Event isolation

**A member of Event A must never access guests belonging to Event B.**

- **Reads:** the Firestore rule (`guests/{guestId}`) requires
  `isActiveEventMember(resource.data.eventId)` — the *document's own*
  `eventId`, not one the client asserts. A member of event A has no active
  membership document for event B, so the rule fails for event B's guests
  regardless of what the client's query asks for. Covered by
  `tests/firestore.rules.test.ts` (`'a member of a different event cannot
  read this event's guest'`).
- **Writes (update/delete):** authorization is checked against the guest's
  ***stored*** `eventId` (loaded from the document itself), never a
  client-supplied one. An owner of event B calling `updateGuest`/
  `deleteGuest` with event A's `guestId` is checked against event A's
  membership requirement — which they don't have — and rejected with
  `event_access_denied`. Covered by
  `functions/src/__tests__/{updateGuest,deleteGuest}.test.ts`
  (`"an owner of a different event cannot {update,delete} this event's
  guest"`).

## 8. Guests page

`/events/:eventId/guests` (`GuestsPage`), reached from a new **Guests** item
in the event workspace navigation (alongside **Overview** and **People**).
Uses the same access check as the workspace Overview and the People page
before showing anything.

- **Filter tabs** `[All] [Bride] [Groom]` and a **name/phone search** both
  run client-side over the already-loaded guest list — no extra Firestore
  reads per click, and it sidesteps a subtlety of filtering server-side: a
  `where('side', '==', 'bride')` query would miss "both" guests, so a
  same-shaped "server filter" would need two merged queries per tab anyway.
  The full list is small enough per event that this stays simple, matching
  the step's "do not over-engineer" instruction.
- **Counts** — Total, Bride, Groom — computed from the full (unfiltered)
  guest list; a guest with `side: both` contributes to both the Bride and
  Groom counts as well as Total (`computeGuestCounts`,
  `src/features/events/types/guests.ts`).
- **Add/Edit** is one shared `GuestForm`, shown inline (toggled, not a
  separate route) — Name, Phone, Email, Side, Relation, Notes, Status. Only
  rendered when `canManage` is true; a modified client that renders it
  anyway still can't succeed, since `createGuest`/`updateGuest` re-check
  authority server-side.
- **Delete** asks for confirmation (`window.confirm`) before calling
  `deleteGuest` — no custom modal component introduced for one destructive
  action.

## 9. UI states

Loading (`LoadingSkeleton`), denied/not-found (the same `resource-notice`
pattern as People/Overview), error (`ErrorState`, friendly message + Retry —
`GuestError`/`EventLoadError` carry only a friendly message, never a
Firestore code or stack trace), and the empty state:

- **No guests on the event at all:** "No guests added yet." (plus
  `[+ Add Guest]` for owner/planner, per spec).
- **Guests exist, but the current filter/search matches none:** "No guests
  match your search." — distinct copy so a planner searching for a
  misspelled name isn't told the guest list is empty.

## 10. Future permission foundation (not implemented here)

The step is explicit that granular per-side permissions are a **future**
step, not this one. Nothing below is implemented — this section documents
how the current code is shaped so that step doesn't require a rewrite:

- **`Guest.side`** already exists and is validated today, expressly so a
  future permission layer can filter by it.
- **`EventMember.side`** already exists (Step 10, `EventMemberSide`) for
  couple/family members. A future guest-visibility rule for a Bride/Groom
  member would compare their *own* `EventMember.side` against
  `Guest.side` — both fields already there, no schema change needed.
- **The intended future rule shape**, to implement later (not now):
  - Planner (and Owner) → all guests, as today.
  - Bride → guests where `side` is `bride` or `both`.
  - Groom → guests where `side` is `groom` or `both`.
  - Family → some still-to-be-designed limited slice (likely also
    side-scoped, possibly narrower).
  - Everyone else (Staff, Viewer) → unspecified; deliberately not decided
    yet.
- **Where this would slot in:** `GuestService.listGuests` already isolates
  "which guests may this caller see" from the repository read — extending
  it to filter `guests` by the caller's own `EventMember.side` (instead of
  returning every guest to every active member, as it does today) touches
  exactly one method, not the repository, the Cloud Functions, or the
  Firestore rule's `isActiveEventMember` check. The Cloud Functions'
  `verifyEventManagementAuthority` (write-side) is similarly a single choke
  point to extend with a side comparison, should Family ever get scoped
  *write* access to their own side.
- **What this step deliberately does not do:** no permission matrix, no
  `permissions` field on `EventMember` or `Guest`, no per-guest ACL. Adding
  any of those now, ahead of the design step that decides Family's actual
  scope, would be exactly the kind of premature abstraction the project's
  steps have consistently avoided (see `docs/events.md` §12 and
  `docs/invitations.md` §12 for the same reasoning applied to event
  creation and invitations).

## 11. Architecture

Unchanged shape from Steps 8–10:

```
Guests page   → GuestService (read)  → Repository Interfaces      → Firebase Repositories → Firestore
Add/Edit/Del  → GuestService (write) → Callable Cloud Functions    → Admin SDK             → Firestore
```

`GuestService` (`src/features/events/services/guestService.ts`) is one
class handling both, mirroring `EventCreationService` (Step 9) rather than
the People/Invitation split (Step 10) — reads and writes here belong to one
small, cohesive flow (view-and-manage-my-guest-list), not two distinct
features. React components never import Firestore or a Firebase repository;
`useGuestList` (hook) and `GuestForm`/`GuestList` (components) only ever
talk to `GuestService`.

## Structure

```
functions/src/shared/eventAuthority.ts   verifyEventManagementAuthority (shared with invitations)
functions/src/guests/
  shared.ts          field validation, Guest document builder
  createGuest.ts      authority check, create
  updateGuest.ts      load existing, authority check on its eventId, update
  deleteGuest.ts      load existing, authority check on its eventId, delete

src/types/guest.ts                                 Guest, GuestSide, GuestStatus
src/repositories/interfaces/guestRepository.ts
src/services/firebase/repositories/firebaseGuestRepository.ts

src/features/events/
  types/guests.ts                    GuestListData, GuestFormInput, computeGuestCounts
  services/guestService.ts           read (repository) + write (Cloud Functions)
  hooks/useGuestList.ts
  components/GuestList.tsx
  components/GuestForm.tsx
  pages/GuestsPage.tsx                /events/:eventId/guests
```
