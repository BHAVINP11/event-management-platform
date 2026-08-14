# Guest Management

## 1. Purpose

Step 11 added the platform's first real event module: a guest list. Step 12
adds scoped access to it — a bride/groom collaborator sees and manages only
their own side of the guest list, enforced server-side, not just hidden in
the UI.

A **Guest is an event attendee, not a platform User.** They need no account,
login, or profile — just a name and whatever contact/relationship details the
event's planner, owner, bride, or groom chooses to record:

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

No domain model changed in Step 12 either — scoping is authorization logic
over the existing `EventMember.role`/`.side` and `Guest.side` fields, not a
new field or collection.

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
calls them — see §4. `listByEventAndSide`, unused in Step 11, is now what a
couple member's read is built from — see §5.

## 4. Trusted CRUD

Three callable Cloud Functions, `functions/src/guests/{createGuest,
updateGuest,deleteGuest}.ts`, are the only way a guest is ever written.
Firestore rules deny all client writes to `guests` (see §7); reads go
through the ordinary repository/rules path instead, scoped per §5.

Every operation verifies, in this order:

1. **Authenticated** — `context.auth` present, else `unauthenticated`.
2. **Active EventMember** — the caller has an `eventMembers/{eventId}_{uid}`
   document with `status: active` for the *relevant* event (see §7 for what
   "relevant" means for update/delete). Loaded by
   `loadActiveEventMembership` (`functions/src/shared/eventAuthority.ts`),
   which returns the caller's `role` and `side` — this one function is
   reused by `createInvitation` too (which only needs role), so the two
   features can't drift apart on what "an active membership for this event"
   means.
3. **Role and side** — `functions/src/guests/authorization.ts` decides,
   given the membership's role/side and (for update) the guest's existing
   and requested sides. See §5 for the exact rules and §6 for error codes.

## 5. Scoped access rules

| Role | View | Create / Update / Delete |
| --- | --- | --- |
| Owner | all guests | all guests, any side |
| Planner | all guests | all guests, any side |
| Couple, side=bride | bride + both | bride + both only |
| Couple, side=groom | groom + both | groom + both only |
| Family | all guests | — (view only) |
| Staff | all guests | — (view only) |
| Viewer | all guests | — (view only) |

**Family is intentionally not scoped by side in this step** — it views the
full guest list, same as Staff/Viewer. See §10 for why, and for the future
shape once Family scoping is designed.

The four functions `functions/src/guests/authorization.ts` defines (and
`src/features/events/services/guestAuthorization.ts` mirrors on the client,
for UI purposes only — see §8):

- **`canViewGuest(membership, guestSide)`** — owner/planner always; a couple
  member only if `canAccessGuestSide(membership.side, guestSide)`;
  family/staff/viewer always (not scoped this step).
- **`canCreateGuest(membership, requestedSide)`** — owner/planner any side; a
  couple member only a side `canAccessGuestSide` allows; family/staff/viewer
  never.
- **`canUpdateGuest(membership, existingSide, requestedSide)`** —
  owner/planner any change; a couple member only if **both** the guest's
  current side and the requested new side are within their scope (see §5.1);
  family/staff/viewer never.
- **`canDeleteGuest(membership, guestSide)`** — same shape as create/view.

And the one rule everything above is built from:

```
canAccessGuestSide(memberSide, guestSide):
  memberSide == bride: guestSide in [bride, both]
  memberSide == groom: guestSide in [groom, both]
  otherwise: false
```

### 5.1 Update: side changes are constrained at both ends

A bride may change a bride-side guest to `both` (widening it to include the
groom's side too) but not to `groom` (that would hand a guest she can see to
a side she can't). Concretely: `canUpdateGuest` requires
`canAccessGuestSide(bride, existingSide) && canAccessGuestSide(bride, requestedSide)`
— the *existing* side must be hers to touch at all, and the *requested* side
must be one she's allowed to set. `bride → groom` fails the second check;
`bride → both` passes both. A groom member is the mirror image. Owner/planner
skip both checks entirely.

## 6. Errors

New in Step 12: **`guest_side_not_allowed`** (→ `permission-denied`) — a
couple member's role generally permits managing guests, just not this
side. Reserved for that case specifically, so the client can tell "your role
can't do this at all" (`event_role_not_allowed`, unchanged, still what
family/staff/viewer get) apart from "your role can, but not for this guest"
(`guest_side_not_allowed`). Both are produced by
`functions/src/guests/authorization.ts`'s `denyGuestWrite`, which picks
between them based on whether the membership's role is `couple`.

## 7. Event isolation

**A member of Event A must never access guests belonging to Event B.**

- **Reads:** the Firestore rule requires `isActiveEventMember(resource.data.eventId)`
  — the *document's own* `eventId`, not one the client asserts — before the
  side-scoping check in §5 even runs. A member of event A has no active
  membership document for event B, so the rule fails for event B's guests
  regardless of what the client's query asks for.
- **Writes (update/delete):** authorization is checked against the guest's
  ***stored*** `eventId` and `side` (both loaded from the document itself),
  never client-supplied values. An owner — or a bride — of event B calling
  `updateGuest`/`deleteGuest` with event A's `guestId` is checked against
  event A's membership requirement, which they don't have, and rejected
  with `event_access_denied` (not `guest_side_not_allowed` — they fail the
  membership check before side is ever considered). Covered by
  `functions/src/__tests__/{createGuest,updateGuest,deleteGuest}.test.ts`
  (`"an owner/bride of a different event cannot ... this event's guest"`).

## 8. Guests page

`/events/:eventId/guests` (`GuestsPage`), reached from a **Guests** item in
the event workspace navigation (alongside **Overview** and **People**).
Uses the same access check as the workspace Overview and the People page
before showing anything.

- **The guest list itself is already scoped** by `GuestService.listGuests`
  before it reaches the page — a bride's `state.data.guests` contains only
  bride/both guests to begin with (see §5, §11). The `[All] [Bride] [Groom]`
  filter tabs and name/phone search still run client-side, but only ever
  narrow *within* whatever the caller can already see — they are not what
  keeps a bride from seeing groom-only guests; the repository read pattern
  and Firestore rule are.
- **Counts** — Total, Bride, Groom — computed by the unchanged
  `computeGuestCounts` (`src/features/events/types/guests.ts`), but now fed
  the *scoped* list. For a bride, "Groom" therefore reflects only the
  both-side guests she can already see, never the real count of groom-only
  guests (see §8.1 for why that's correct, not a bug).
- **Add/Edit** is one shared `GuestForm`, shown inline (toggled, not a
  separate route) — Name, Phone, Email, Side, Relation, Notes, Status. Only
  rendered when `canManage` is true (owner/planner/couple — see §5). The
  **Side** field is further restricted to `manageableSides`
  (`GuestListData`, computed by `manageableGuestSides` in
  `guestAuthorization.ts`): all three for owner/planner, `[bride, both]` for
  a bride, `[groom, both]` for a groom. A modified client that renders the
  form for a disallowed side anyway still can't succeed —
  `createGuest`/`updateGuest` re-check server-side regardless of what the
  form offered.
- **Delete** asks for confirmation (`window.confirm`) before calling
  `deleteGuest` — no custom modal component introduced for one destructive
  action.

### 8.1 Why a bride's "Groom" count isn't the real groom count

This is intentional, not a leak. The bride's visible guest list never
contains groom-only guests at all (§5), so `computeGuestCounts` computing
"groom" from that list can only count the both-side guests already visible
to her individually — it cannot and does not reveal how many groom-only
guests exist. Revealing that number (even as a bare count, with no names)
would tell her something about the guest list she has no access to; not
showing it, or showing a number derived only from what she can already see,
does not.

## 9. UI states

Loading (`LoadingSkeleton`), denied/not-found (the same `resource-notice`
pattern as People/Overview), error (`ErrorState`, friendly message + Retry —
`GuestError`/`EventLoadError` carry only a friendly message, never a
Firestore code or stack trace), and the empty state:

- **No guests visible to this user at all:** "No guests added yet." (plus
  `[+ Add Guest]` for owner/planner/couple). Note this is about what the
  *caller* can see — a bride event with only groom-only guests recorded
  would show this to the bride, correctly, since she has nothing to see.
- **Guests exist, but the current filter/search matches none:** "No guests
  match your search." — distinct copy so a planner searching for a
  misspelled name isn't told the guest list is empty.

## 10. Why Family is intentionally not scoped yet

Family is spec'd, for this step, as view-only with **full** visibility —
deliberately not narrowed by side. Doing so would require deciding a real
product question this step is explicitly not answering: does a Family
member see their own side, both, or something else — and how would a
`EventMember` even record which side a Family member belongs to (bride/groom
families are not currently distinguished the way a couple member's own
`side` field distinguishes bride from groom)? Guessing at an answer now
would be exactly the kind of premature scope decision the project's steps
have consistently deferred until a dedicated step designs it properly.

What Step 12 *does* leave in place for that future step:

- `canViewGuest` in `functions/src/guests/authorization.ts` already has a
  named branch for non-owner/planner/couple roles (currently `return true`
  unconditionally) — narrowing Family specifically is a one-line change to
  that branch, not a redesign.
- `GuestService.loadScopedGuests` on the client is similarly a single
  `if (membership.role !== EventRole.Couple)` check away from adding a
  Family-specific branch, once there's a `side`-like field to key it off.
- The Firestore rule's `canAccessGuestForEvent` allow-list
  (`["owner", "planner", "family", "staff", "viewer"]`) already separates
  Family out by name; scoping it later means moving `"family"` out of that
  list into its own clause, not rewriting the rule.

No permission matrix, `permissions` field, or per-guest ACL was added to
reach this — see `docs/events.md` §12 and `docs/invitations.md` §12 for the
same reasoning applied elsewhere in this app.

## 11. Architecture

Unchanged shape from Steps 8–11:

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

The client-side `guestAuthorization.ts` is consulted only to decide what the
UI *offers* (which reads to issue, whether to show Add/Edit/Delete, which
Side options a form lists) — never the actual authority. The Cloud Functions
and Firestore rule re-derive the same scope independently, from the stored
`EventMember` document, every time.

## Structure

```
functions/src/shared/eventAuthority.ts   loadActiveEventMembership (role+side),
                                          verifyEventManagementAuthority (owner/planner only, used by invitations)
functions/src/guests/
  authorization.ts    canView/Create/Update/DeleteGuest, canAccessGuestSide, assertCan* (Step 12)
  shared.ts           field validation, Guest document builder
  createGuest.ts      loads membership, assertCanCreateGuest, create
  updateGuest.ts      loads existing + membership, assertCanUpdateGuest(existing.side, requested.side), update
  deleteGuest.ts      loads existing + membership, assertCanDeleteGuest(existing.side), delete

src/types/guest.ts                                 Guest, GuestSide, GuestStatus
src/repositories/interfaces/guestRepository.ts
src/services/firebase/repositories/firebaseGuestRepository.ts

src/features/events/
  types/guests.ts                    GuestListData (+ manageableSides), GuestFormInput, computeGuestCounts
  services/guestAuthorization.ts     canAccessGuestSide, canManageGuests, manageableGuestSides (Step 12)
  services/guestService.ts           read (repository, scoped) + write (Cloud Functions)
  hooks/useGuestList.ts
  components/GuestList.tsx
  components/GuestForm.tsx           Side options limited to allowedSides
  pages/GuestsPage.tsx                /events/:eventId/guests
```
