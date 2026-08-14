# Invitations & Event Collaboration

## 1. Purpose

Step 10 adds the first way for people other than an event's creator to gain
access to it:

```
Planner/Owner → Invite Person → Invitation (pending)
                                      ↓
                              Person accepts
                                      ↓
                          EventMember (active) → event access
```

An Invitation never grants access by itself. Only an active `EventMember`
does, and that is only ever created on acceptance. This mirrors the rest of
the app: authenticated does not mean entitled (Step 8), and creation is never
a client-trusted write (Step 9).

Granular per-module permissions (read/edit rights, guest lists, bride/groom
guest-list splits) are explicitly out of scope — see §12.

## 2. Domain model

`Invitation` (`src/types/invitation.ts`):

```
id, eventId, invitedEmail, invitedPhone?, role, side?,
status (pending | accepted | expired | cancelled),
invitedBy, expiresAt, createdAt, updatedAt
```

`EventMember` gained one optional field, `side` (`src/types/membership.ts`,
`EventMemberSide = bride | groom`). Only `couple` and `family` roles ever set
it; `owner`, `planner`, `staff`, and `viewer` never do — enforced by
`createInvitation`'s validation (§5), not left to convention.

No other domain model changed. No permission field was added anywhere.

## 3. Invitation creation flow

```
EventPeoplePage → [+ Invite Person] → InviteForm
  → InvitationService.createInvitation(eventId, { invitedEmail, role, side? })
  → onCreateInvitation (Cloud Function)
  → Invitation created, status = pending
```

The invite form speaks in guest-facing terms — **Bride**, **Groom**,
**Family**, **Planner**, **Staff**, **Viewer** — not the underlying
`EventRole` values. `resolveInviteRole` (`src/features/events/types/people.ts`)
maps the choice:

| UI choice | Stored role | Stored side |
| --- | --- | --- |
| Bride | `couple` | `bride` |
| Groom | `couple` | `groom` |
| Family | `family` | the form's optional Side field, or none |
| Planner / Staff / Viewer | `planner` / `staff` / `viewer` | none |

The Side field only appears for Family — Bride/Groom already imply a side,
and Planner/Staff/Viewer never have one.

## 4. Organization authorization for inviting

Only an event's **owner** or **planner** may invite (`INVITER_ALLOWED_ROLES`
in `functions/src/invitations/createInvitation.ts`). `createInvitation`
verifies this itself, the same way `createOrganizationEvent` verifies
organization access (Step 9):

1. The event exists (`event_not_found` otherwise).
2. An active `eventMembers/{eventId}_{userId}` document exists whose
   `eventId` field matches (`event_access_denied` otherwise).
3. Its `role` is `owner` or `planner` (`event_role_not_allowed` otherwise).

The client's `canInvite` flag (`EventPeopleService`, via
`AuthorizationService.canInviteToEvent`) only decides whether the "Invite
Person" button is shown — it is not consulted by the Cloud Function, which
re-derives access from the stored membership document regardless of what the
client asserts.

## 5. Validation

`functions/src/invitations/shared.ts` validates, reusing
`functions/src/validation.ts` for the email:

- `invitedEmail`: required, valid format, normalized to lowercase/trimmed.
- `role`: one of `couple`, `family`, `planner`, `staff`, `viewer` —
  **`owner` is rejected**. There is exactly one owner, the event's creator;
  no one is invited into that role.
- `side`: optional for `couple`/`family` (must be `bride`/`groom` if given);
  **must be omitted** for `planner`/`staff`/`viewer` — supplying one is
  rejected as `invalid_side`, not silently dropped.

## 6. Duplicate invitations

Before creating an invitation, `createInvitation` queries for an existing
**pending** invitation with the same `eventId` + `invitedEmail` and rejects
with `invitation_already_pending` if one exists. A cancelled, expired, or
already-accepted invitation does not block a new one.

The invitation ID is an auto-generated Firestore document ID — invitations
are not part of the deterministic-membership-ID convention (that convention
identifies a *relationship*, `{resourceId}_{userId}`; an invitation is an
event on its own, and a person can legitimately be invited, expire, and be
invited again).

## 7. Acceptance flow

```
/invitations/:invitationId
  ↓
authenticated? → no: /login?redirect=/invitations/:id, then back here
  ↓
InvitationService.getInvitationPreview(invitationId)  — event name, invited email, role
  ↓
[Accept Invitation] → InvitationService.acceptInvitation(invitationId)
  → onAcceptInvitation (Cloud Function)
```

`acceptInvitation` (`functions/src/invitations/acceptInvitation.ts`) checks,
in order:

1. The invitation exists.
2. Its `status` is `pending`.
3. Its `expiresAt` (14 days from creation, server-set, not client-configurable)
   has not passed.
4. The caller's **authenticated** email (`context.auth.token.email`, from the
   ID token — never a client-supplied field) matches `invitedEmail`,
   case-insensitively.

Only then does it write, atomically in one batch:

- `eventMembers/{eventId}_{userId}` (the existing deterministic convention,
  `src/repositories/membershipIds.ts` / `functions/src/shared/membershipIds.ts`) —
  `role`, `side`, and `invitedBy` copied from the invitation; `status: active`.
- `invitations/{invitationId}.status = accepted`.

If an **active** membership already exists at that path (e.g. a race between
two acceptances, or the person already has access some other way), it is
left untouched — only the invitation is marked accepted. A non-active
membership at that path (inactive/revoked) is reactivated with the
invitation's role/side, since the deterministic ID already ties it to this
exact event + user.

### Why a `getInvitationPreview` function, not a Firestore rule

The invitee cannot read `events/{eventId}` before they have an active
membership — accepting is exactly what creates one. Widening that rule to
let any invitee read the event would expose the *entire* event document
(venue, dates, description) to anyone holding an invitation link, for the
sake of showing just the event's name. `getInvitationPreview` is a read-only
callable, gated by the identical email-match check `acceptInvitation` uses,
that returns only `{ eventName, invitedEmail, role, side }`. "Do not grant
access before acceptance" applies to the preview too, not only to the
`EventMember` write.

## 8. Returning to the invitation after login

`/invitations/:invitationId` is deliberately **not** wrapped in
`ProtectedRoute` — an unauthenticated visitor needs to land back on this
exact URL after authenticating, which `ProtectedRoute`'s unconditional
redirect to `/login` doesn't preserve. Instead:

- The page itself redirects to `/login?redirect=/invitations/<id>` when
  unauthenticated.
- `LoginForm`, `SignupForm`, and `PublicRoute` read that `redirect` param
  (`src/lib/redirectTarget.ts`) and, if it points at `/invitations/`, go
  there instead of `/dashboard`. Anything else is ignored — this is a
  narrow allowance for the one legitimate destination, not a general
  open-redirect mechanism.

## 9. People page

`/events/:eventId/people` uses the same access check as the workspace
Overview (`AuthorizationService.canAccessEvent`) before showing anything.
It lists, in one flat list, active/other-status `EventMember`s followed by
still-**pending** invitations (accepted/expired/cancelled invitations are not
shown — accepted ones already appear as members).

**Why most rows don't show a name.** Firestore rules restrict
`users/{userId}` reads to the profile's own owner (unchanged since Step 4).
Rather than widen that boundary for this feature, `EventPeopleService` only
resolves a display name for the *current* viewer's own row; every other
member's row falls back to the label "Member." Pending invitation rows
always show `invitedEmail`, since that lives on the Invitation document
itself, not on a `users/{userId}` profile. A denormalized name/email on
`EventMember`, or a relaxed `users` read rule, would fix this — deliberately
not done here to keep this step's Firestore rules change limited to what
collaboration actually requires (see §11).

## 10. Firestore rules changes

Both changes are **read** widenings, each still gated on the caller already
being an authenticated, active member of the *same* event — no write
permission changed, and `organizationMembers`/`organizations`/`events` rules
are untouched:

```
eventMembers/{membershipId}:
  allow read: if resource.data.userId == self
           || isActiveEventMember(resource.data.eventId)   // NEW

invitations/{invitationId}:
  allow read: if resource.data.invitedEmail == self's auth token email (case-insensitive)
           || isActiveEventMember(resource.data.eventId)
  allow write: if false   // unchanged pattern — Cloud Functions only
```

The first clause lets an invitee read their own invitation directly (used by
`InvitationRepository`, though the acceptance page itself goes through
`getInvitationPreview` instead — see §7). The second lets any active event
member list every member/invitation for their own event, which is what the
People page needs. All writes to both collections remain denied to clients;
`createInvitation` and `acceptInvitation` write through the Admin SDK, which
is not subject to these rules.

## 11. Why invitations don't create EventMembers directly

A client could, in principle, be trusted to write straight to
`eventMembers` — but that is exactly the write Step 9 already established
must never be client-trusted (role, status, and `invitedBy` are exactly the
fields a malicious client would want to control). Nothing about
collaboration changes that: `createInvitation` writes only a *pending*
`Invitation`; the `EventMember` write happens exclusively inside
`acceptInvitation`, after the identity check in §7.

## 12. Why granular permissions are intentionally deferred

`OrganizationRole` and `EventRole` (plus the new `EventMemberSide`) remain
the only authorization vocabulary. No read/edit/module-level permission
field exists on `EventMember` or `Invitation`, and none is checked anywhere
in this step. Inviting is gated on role alone (owner/planner); the People
page is visible to any active member regardless of role. Finer-grained
access — who can see the bride-side guest list vs. the groom-side one, who
can edit vs. only view — has no feature to attach to until the workspace
has guest lists, functions, expenses, etc. (still unbuilt), and is deferred
to a dedicated authorization step once that foundation exists.

## Structure

```
functions/src/invitations/
  shared.ts               role/side validation, Invitation document builder
  createInvitation.ts     inviter-authority check, duplicate check, create
  acceptInvitation.ts     pending/expiry/email checks, atomic accept
  getInvitationPreview.ts read-only event name + invitation summary

functions/src/shared/
  callableContext.ts       CallableAuthContext (now carries token.email)
  membershipIds.ts          unchanged, reused by invitations too

src/features/events/
  types/people.ts                    EventPeopleData, invite role mapping
  services/eventPeopleService.ts     People page reads + canInvite
  services/invitationService.ts      createInvitation/acceptInvitation/preview calls
  hooks/useEventPeople.ts
  hooks/useInvitationAcceptance.ts
  components/PeopleList.tsx
  components/InviteForm.tsx
  pages/EventPeoplePage.tsx          /events/:eventId/people
  pages/InvitationAcceptPage.tsx     /invitations/:invitationId

src/repositories/interfaces/invitationRepository.ts
src/services/firebase/repositories/firebaseInvitationRepository.ts
src/lib/redirectTarget.ts
```

Data still flows in one direction, through the same two boundaries Step 9
established — a repository for ordinary reads, a Cloud Function for every
privileged write:

```
People page   → EventPeopleService  → Repository Interfaces  → Firebase Repositories → Firestore
Invite/Accept → InvitationService   → Callable Cloud Functions → Admin SDK            → Firestore
```
