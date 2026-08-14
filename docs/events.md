# Events

## 1. Event types

There is one `Event` model (`src/types/event.ts`). There are no separate
planner-event and couple-event models, and no separate creation systems for
them — the same document shape, the same `EventMember` relationship, and the
same workspace route serve every event.

`EventType` (`wedding`, `social`, `corporate`, `private`, `other`) describes
what the event is. It is unrelated to who created it or who owns it.

## 2. Individual events

An event with `organizationId === null` is an individual event. It is created
either during individual onboarding (Step 7) or afterwards through
`/events/new` → **My own event**. It belongs to its `EventMember`s, not to a
company, and a single user may own more than one individual event over time —
Step 9 does not assume one user has exactly one event.

## 3. Organization events

An event with `organizationId` set belongs to that organization. It is created
by a member of the organization with an event-creation-capable role (owner,
admin, or planner) through `/events/new` → **An organization event**.

Organization membership and event membership remain two separate collections.
Creating an organization event makes the creator an `EventMember` of that
event; it does not, by itself, change anyone's `OrganizationMember` records.

## 4. Event creation flows

```
Dashboard → [+ Create Event] → /events/new
```

`/events/new` (`EventCreatePage`) first loads which organizations the caller
may create events for, via
`EventCreationService.getCreatableOrganizations(userId)` (active
`OrganizationMember` memberships with role owner/admin/planner, resolved to
organization names). What the user sees next depends on that list:

- **Zero eligible organizations** — the event form is shown directly, for an
  individual event. There is nothing to choose.
- **One or more eligible organizations** — two entry points are offered,
  **My own event** and **An organization event**. Choosing the latter with
  exactly one eligible organization skips straight to the form; with more than
  one, a simple radio-button selector is shown first.

Either path ends at the same event form (name, type, start date, timezone
required; end date, venue name, venue address, description optional) and
submits to one of two callable Cloud Functions:

```
Individual:   EventForm → EventCreationService.createIndividualEvent()   → onCreateIndividualEvent
Organization: EventForm → EventCreationService.createOrganizationEvent() → onCreateOrganizationEvent
```

On success the browser navigates to `/events/{eventId}`. This choice is
presented for the user's convenience only — see §9 for why it carries no
authority.

## 5. Ownership

`Event.createdBy` and the creator's `EventMember.userId` are always
`context.auth.uid` from the callable's authentication context. Neither
function reads `createdBy`, `ownerId`, or `userId` from the request body,
so a client cannot create an event on someone else's behalf by adding those
fields to the payload (`functions/src/__tests__/createIndividualEvent.test.ts`
and `createOrganizationEvent.test.ts` assert this directly).

## 6. EventMember creation

Every event creation atomically writes two documents in one Firestore batch:
the `Event` itself, and one `EventMember` for the creator:

```
role:       EventRole.Owner
status:     MembershipStatus.Active
invitedBy:  null
id:         `${eventId}_${userId}`   (deterministic — shared convention, see
                                      src/repositories/membershipIds.ts)
```

No other membership is created. The client cannot request a different role,
a different status, or a membership for a different user — the builder in
`functions/src/events/shared.ts` (`buildEventMemberDocument`) hard-codes all
three.

## 7. Event status

Every new event starts as `EventStatus.Draft`. The client does not choose the
initial status — `buildEventDocument` in `functions/src/events/shared.ts`
hard-codes it. Status transitions (draft → active → completed → archived) are
not implemented in Step 9.

## 8. Trusted Cloud Function creation

Firestore rules deny all client writes to `events`, `eventMembers`,
`organizations`, and `organizationMembers` (unchanged since Step 6.1 — see
`firestore.rules`). The only way to create an event is through one of two
callable Cloud Functions, both under `functions/src/events/`:

```
functions/src/events/
  shared.ts                 field validation + Event/EventMember document builders
  createIndividualEvent.ts  individual event creation + handler
  createOrganizationEvent.ts organization event creation, authorization + handler
```

`createIndividualEvent` also backs individual onboarding (Step 7) — there is
only one way to create an individual event, so the onboarding step and the
post-onboarding "Create Event" flow call the same function rather than two
functions that could drift apart.

Each `handleCreate*` function is independent of `firebase-functions` and
`firebase-admin` — it takes a Firestore instance and a minimal
`{ auth?: { uid } }` context as parameters — so it is unit tested against an
in-memory fake Firestore (`functions/src/__tests__/fakeFirestore.ts`) rather
than the emulator. `functions/src/index.ts` wires each handler to a
`functions.https.onCall`, which is the only place the Admin SDK is
initialized.

Validation reuses the same field validators Step 7 introduced
(`functions/src/validation.ts`: name, type, start/end date, IANA timezone,
venue fields) via a single `validateEventCreationFields` in
`functions/src/events/shared.ts`, so the two creation flows cannot validate
the same fields differently.

## 9. Authorization

**Individual event:** any authenticated user may create one. There is no
membership to check — `handleCreateIndividualEvent` only requires
`context.auth`.

**Organization event:** the caller must have an active, event-creation-capable
organization membership. `verifyOrganizationEventCreationAccess` in
`functions/src/events/createOrganizationEvent.ts` checks, against the stored
documents (never anything the client asserts about its own access):

1. The organization document exists (`organization_not_found` otherwise).
2. An `organizationMembers/{organizationId}_{userId}` document exists, its
   `organizationId` field matches the requested organization, and its
   `status` is `active` (`organization_access_denied` otherwise).
3. Its `role` is `owner`, `admin`, or `planner` — the same roles
   `AuthorizationService.canCreateEventInOrganization` uses on the client to
   decide whether to offer the organization entry point at all
   (`organization_role_not_allowed` otherwise).

The client-side list of creatable organizations
(`EventCreationService.getCreatableOrganizations`) exists only to avoid
offering a choice that would fail — it is not consulted by the Cloud
Function, which re-derives access from scratch. A modified client that skips
straight to `onCreateOrganizationEvent` with an arbitrary `organizationId`
gets exactly the same check.

Errors returned to the client are one of: `unauthenticated`, `invalid_input`
(and the more specific `invalid_name` / `invalid_type` / `invalid_start_date`
/ `invalid_end_date` / `invalid_timezone` / `invalid_venue_name` /
`invalid_venue_address` / `invalid_organization_id`), `organization_not_found`,
`organization_access_denied`, `organization_role_not_allowed`, `conflict`, or
`internal_error` — never a Firestore path, Firebase error code, or stack
trace. `EventCreationService` converts these into an `EventCreationError`
(`src/lib/appError.ts`) carrying only a friendly message and the code, before
they reach the UI.

## 10. Event workspace

`/events/:eventId` (`EventWorkspacePage`) is unchanged in its access pattern
from Step 8:

```
/events/:eventId
  ↓
AuthorizationService.canAccessEvent(userId, eventId)
  ↓
allowed? → no: access-denied state (event never read)
         → yes: EventRepository.getById(eventId) → not-found, or the workspace
```

The workspace itself is now a small shell: a header (name, date, status), a
section navigation bar, and one real section:

```
Overview | Guests (soon) | Functions (soon) | Expenses (soon) | Vendors (soon) | Tasks (soon)
```

Only **Overview** renders anything — event type, date, venue (when set),
status, the caller's `EventRole`, and the organization name (see §"Individual
events vs organization events" in [docs/dashboard.md](dashboard.md) for why
that name is sometimes withheld). The other five are labeled navigation items
with a "Soon" tag and no route, page, or data model behind them — guests,
functions, expenses, vendors, and tasks are explicitly out of scope for this
step.

## 11. Why invitations are intentionally deferred

Every `EventMember` created in Step 9 is the event's creator, made `owner`.
There is no invitation document, no invite UI, no email send, and no
acceptance flow. Adding a second member to an event today would mean writing
to `eventMembers` directly with an assumed role and status — exactly the kind
of client-trusted membership write the Cloud-Function-only creation model
exists to prevent. Inviting other people onto an event needs its own
authorization design (who may invite, into which role, how acceptance is
verified) and is deferred to a dedicated step rather than bolted onto event
creation.

## 12. Why granular permissions are intentionally deferred

`OrganizationRole` and `EventRole` are the only authorization vocabulary in
Step 9, exactly as in Steps 6–8. No read/edit/module-level permission field
was added to `EventMember`, and the workspace does not check one — role
membership alone gates the entry points this step has (creating an
organization event; opening an event's Overview). Finer-grained access —
per-module visibility, bride-side/groom-side splits, edit-vs-view rights on a
guest list that doesn't exist yet — has no feature to attach to until the
workspace itself has modules, and is left to a dedicated authorization step
once that foundation exists.
