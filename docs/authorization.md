# Authorization Foundation

## Security boundary

Authentication identifies a user; authorization determines the resources that user may access. The Firestore Security Rules in `firestore.rules` are the actual security boundary. Application code, route guards, hidden controls, and `AuthorizationService` are useful for UX and application behavior, but a user can bypass them by calling Firestore directly.

Consequently, an organization may be read only by an authenticated user with an active organization membership, and an event may be read only by an authenticated user with an active event membership. Firestore enforces those checks independently of React and the application service.

## Membership access model

Organization and event membership are separate. Belonging to an organization does not grant access to every event owned by that organization; access to each event is explicit.

An active organization member may read `organizations/{organizationId}`. An active event member may read `events/{eventId}`. Memberships with any status other than `active` grant no access.

## Deterministic membership IDs

Membership documents use deterministic document IDs:

- `organizationMembers/{organizationId}_{userId}`
- `eventMembers/{eventId}_{userId}`

The underscore separator is a fixed literal. IDs are built only by the shared helper at `src/repositories/membershipIds.ts`:

```ts
getOrganizationMembershipId(organizationId, userId);
getEventMembershipId(eventId, userId);
```

The rules use the same construction to find the relationship document by path. For example, a request by `user1` for `organizations/org1` checks `organizationMembers/org1_user1` exists and has `status == "active"`.

Deterministic paths make one document the sole persistence location for each relationship, enforcing uniqueness for `(organizationId, userId)` and `(eventId, userId)`. Membership repositories create through a transaction and return `RepositoryConflictError` if that path already exists, so neither role nor status is overwritten.

## Client and server responsibilities

Clients may read only their own membership documents. All client membership writes are denied, so users cannot create a relationship or promote themselves to owner, admin, planner, couple, or staff. Organization and event writes are also denied from clients. These changes will be performed by a controlled server-side workflow.

The application-layer `AuthorizationService` remains available for `canAccessOrganization`, `canAccessEvent`, membership lookup, and user membership lists. It supports navigation and product behavior but is not the source of data security.

## Query constraints

Firestore rules are not filters. A query is allowed only when Firestore can prove every possible returned document is permitted by the rules. The membership list methods therefore query only the caller's own membership records in client use; broad organization/event membership queries require a future controlled server-side workflow.

## Future invitations

Invitation and membership-management workflows are intentionally deferred. A future server-side invitation flow will validate authority, create or update the deterministic membership document, and set the appropriate role and lifecycle status.

## Tests

`tests/firestore.rules.test.ts` uses the Firestore Emulator to verify access directly against the rules, including bypass attempts by authenticated non-members, inactive memberships, and arbitrary membership writes.

Run:

```bash
npm run test:rules
```
