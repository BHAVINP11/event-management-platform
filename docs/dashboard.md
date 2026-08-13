# Dashboard

## 1. Purpose

The platform is one application. There is no planner application and no couple
application, and there are no per-persona dashboards such as
`/planner-dashboard` or `/couple-dashboard`.

There is a single route, `/dashboard`, which answers one question:

> What do I have access to?

It is a resource launcher. It lists the organizations and events the
authenticated user is an active member of, shows the user's role in each, and
provides a way to open an event. It deliberately contains no analytics, charts,
activity feeds, notifications, search, or filters.

The same page serves a planner who belongs to several organizations and a couple
who owns one event. It adapts purely to the resources the user can reach — not
to an account type. No account-type or permission field exists on `User`, and
none is introduced by the dashboard.

## 2. Organization discovery

```
Current user (Firebase UID / User.id)
  → OrganizationMember records for that user
  → Organization documents referenced by the active memberships
```

`AuthorizationService.getUserOrganizations(userId)` lists the user's
organization memberships and keeps the active ones. `DashboardService` then
reads each referenced organization document by ID, in parallel.

Members of an organization are never enumerated to build this view. The read
cost of a dashboard load is:

| Read                                     | Count |
| ---------------------------------------- | ----- |
| Query: organization memberships for user | 1     |
| Query: event memberships for user        | 1     |
| Get: organization documents              | N     |
| Get: event documents                     | M     |

The two queries run in parallel, as do the two batches of document reads.

Each organization is projected to a summary containing only `name`, an optional
`description`, and the user's `OrganizationRole`. Slug, contact details, and
audit fields are not surfaced.

## 3. Event discovery

```
Current user (Firebase UID / User.id)
  → EventMember records for that user
  → Event documents referenced by the active memberships
```

Each event is projected to a summary containing `name`, `type`, `startDate`,
optional `endDate`, `status`, and the user's `EventRole`.

The identity used throughout is the application `User.id`, which is the Firebase
Auth UID. Email, display name, `localStorage`, and client-supplied identifiers
are never used as the authorization identity.

### Ordering

Events are sorted into three buckets:

1. **Upcoming** — soonest start date first. An event stays upcoming until its
   end date (or start date, when there is no end date) is in the past, so an
   in-progress multi-day event does not drop to the bottom of the list.
2. **Undated** — alphabetically.
3. **Past** — most recently finished first.

There is no sorting or filtering UI.

## 4. Active membership requirement

Authenticated does not mean entitled. A resource appears on the dashboard only
when the user's membership has `MembershipStatus.Active`.

`pending`, `inactive`, and `revoked` memberships are filtered out before any
document is read, so a revoked member does not even generate a read for the
resource they lost access to.

Invitations are not implemented. A user who has been invited but has no active
`EventMember` record has no access and sees nothing.

A membership whose referenced organization or event no longer exists is skipped
rather than rendered as a broken row.

## 5. Event access flow

```
/events/:eventId
  ↓
ProtectedRoute — authenticated?           → no: /login
  ↓
AuthorizationService.canAccessEvent(userId, eventId)
  ↓
allowed?
  ├── no  → access-denied state (the event is never read)
  └── yes → EventRepository.getById(eventId)
              ├── null → not-found state
              └── event → placeholder event page
```

Authorization is checked **before** the event document is read. Hiding an event
from the dashboard is not access control: typing `/events/<id>` for an event the
user is not an active member of produces the access-denied state, and the
document is never requested.

The three failure states are distinct and none of them leak provider detail:

| Situation                            | State shown                                 |
| ------------------------------------ | ------------------------------------------- |
| No active membership                 | "You don't have access to this event"       |
| Active membership, document missing  | "We couldn't find this event"               |
| Read failed (network/Firestore down) | "We couldn't load this event right now." + Try Again |

The last row matters: an infrastructure failure is reported as an error with a
retry, never as an access denial. `AuthorizationService` returns
`infrastructure_error` for that case rather than a silent `false`.

Firestore error codes, stack traces, and internal identifiers never reach the
UI. `DashboardService` and `EventAccessService` convert repository errors into
`DashboardLoadError` / `EventLoadError`, which carry only a friendly message.

## 6. Individual events vs organization events

An `Event` has an optional `organizationId`.

- `organizationId === null` — an individual event, created during individual
  onboarding. It belongs to its members, not to a company.
- `organizationId` set — the event belongs to that organization.

**Organization membership and event membership are separate.** Being an active
member of an event that carries an `organizationId` grants no organization
access whatsoever.

Because of this, the organization name shown against an event is resolved only
when the user independently has access to that organization:

- On the dashboard, the name is taken from the organizations the user is already
  an active member of. No extra read is issued, and no name is shown for an
  organization the user cannot see.
- On the event page, `AuthorizationService.canAccessOrganization()` is called
  before the organization document is read.

## 7. Why the dashboard is not a security boundary

The dashboard runs in the browser. Everything it does — the membership filter,
the sort, the access check on `/events/:eventId`, the visibility of the Create
Event button — is application behaviour. It exists so the product behaves
correctly and predictably, not so data is protected.

All of it is reachable by anyone who can open developer tools. A modified client
can skip every check in this feature.

The dashboard's job is to make the application behave correctly for a
well-behaved client. Protecting data is a different job, done elsewhere.

## 8. Firestore Rules as the actual security boundary

`firestore.rules` is the real boundary, and it is enforced by the server on
every request regardless of what the client does.

- `organizations/{id}` and `events/{id}` are readable only by an active member,
  proven via the deterministic membership document at
  `organizationMembers/{organizationId}_{userId}` /
  `eventMembers/{eventId}_{userId}`.
- `organizationMembers` and `eventMembers` are readable only where the document's
  `userId` equals `request.auth.uid`. This is what makes the dashboard's
  `where('userId', '==', uid)` query legal and an unfiltered listing illegal.
- Neither collection can be enumerated. `getDocs(collection('events'))` is
  rejected, which is why the dashboard resolves documents by ID.
- All writes are denied to clients. Organizations, events, and memberships are
  created only by trusted Cloud Functions.

Step 8 added no rule changes. `tests/firestore.rules.test.ts` covers the
dashboard's read pattern directly, including that a user cannot list another
user's memberships and cannot enumerate events or organizations.

## 9. Future event workspace

`/events/:eventId` is currently a placeholder that renders the event name, dates,
status, type, and the user's role. The workspace itself — guests, functions,
budgets, vendors, tasks, RSVP — is not built.

`/events/new` is likewise a placeholder. The Create Event button that points at
it is shown only to users with an active organization membership whose role is
`owner`, `admin`, or `planner`; the underlying creation permission model is
defined in Step 9, and the trusted backend remains the authority on creation
regardless of what the button does.

## Structure

```
src/features/dashboard/
  services/dashboardService.ts    coordinates the reads, converts errors
  services/eventSorting.ts        the three-bucket ordering
  hooks/useDashboardData.ts       loading / ready / error state
  components/                     organization and event sections
  pages/DashboardPage.tsx

src/features/events/
  services/eventAccessService.ts  authorization check, then load
  hooks/useEventAccess.ts
  pages/EventWorkspacePage.tsx    placeholder
  pages/EventCreatePage.tsx       placeholder

src/app/services.ts               composition root
```

Data flows in one direction:

```
Dashboard UI → Dashboard Service → Repository Interfaces
                                 → Firebase Repositories → Firestore
```

React components never import Firestore or a Firebase repository. Feature
services depend on the interfaces in `src/repositories/interfaces/`; the
concrete Firebase implementations are bound to them in `src/app/services.ts`,
which is the only module that knows both sides. This is what makes the services
testable against in-memory fakes in `tests/unit/`.
