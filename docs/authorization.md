# Authorization Foundation

This document describes the authorization model for the Event Management Platform.

## 1. Authentication vs Authorization

**Authentication:** Who are you?

Firebase Authentication answers this through email/password or social sign-in.

**Authorization:** What can you do?

This document covers authorization — determining what resources an authenticated user can access.

## 2. Core Access Model

A user may:

- belong to multiple organizations
- belong to multiple events

An organization may:

- have multiple members
- manage multiple events

An event may:

- belong to an organization (planner-created)
- exist without an organization (couple-created)

Therefore:

```
USER
 ├── OrganizationMember → Organization
 │
 └── EventMember → Event

EVENT
 └── organizationId (optional)
```

## 3. Organization Access

A user can access an organization only if:

1. There is an `OrganizationMember` record where:
   - `organizationId` == requested organization ID
   - `userId` == authenticated Firebase UID
   - `status` == `active`

Inactive memberships do not grant access.

Example:

```typescript
const result = await authorizationService.canAccessOrganization(userId, organizationId);
if (result.allowed) {
  // User has active membership in this organization
}
```

## 4. Event Access

A user can access an event only if:

1. There is an `EventMember` record where:
   - `eventId` == requested event ID
   - `userId` == authenticated Firebase UID
   - `status` == `active`

Inactive memberships do not grant access.

Example:

```typescript
const result = await authorizationService.canAccessEvent(userId, eventId);
if (result.allowed) {
  // User has active membership in this event
}
```

## 5. Organization and Event Membership Are Separate

For an event with `organizationId != null`:

- Organization membership does **NOT** automatically grant event membership.
- Event membership must be explicit.

This allows future flexibility:

> An organization employee can belong to the company but only have access to selected events.

## 6. Couple-Created Events

For an event where `organizationId == null`:

- Access is based entirely on `EventMember` membership.
- Example:
  - User creates event → `Event.organizationId = null`
  - User becomes `EventMember` with role `owner` and status `active`
  - User gains access

## 7. Planner-Created Events

For an event where `organizationId = <org_id>`:

- Access is controlled through `EventMember` membership (not automatically through organization membership).
- Example:
  - Organization creates event → `Event.organizationId = org_id`
  - Planner becomes `EventMember` with role `planner` and status `active`
  - Planner gains access to the event

## 8. Authorization Service

The application layer provides an `AuthorizationService` at:

`src/features/auth/services/authorizationService.ts`

### Methods

**canAccessOrganization(userId, organizationId): Promise<AuthorizationResult>**

Check if a user has active membership in an organization.

Returns: `{ allowed: boolean, reason?: AuthorizationDenyReason }`

Possible reasons:
- `unauthenticated` — userId is empty
- `membership_not_found` — no OrganizationMember record exists
- `membership_inactive` — membership status is not `active`
- `infrastructure_error` — Firestore/repository error

**canAccessEvent(userId, eventId): Promise<AuthorizationResult>**

Check if a user has active membership in an event.

Returns: `{ allowed: boolean, reason?: AuthorizationDenyReason }`

**getOrganizationMembership(userId, organizationId): Promise<OrganizationMember | null>**

Fetch the user's membership record for an organization (if it exists).

**getEventMembership(userId, eventId): Promise<EventMember | null>**

Fetch the user's membership record for an event (if it exists).

**getUserOrganizations(userId): Promise<OrganizationMember[]>**

Fetch all active organization memberships for a user.

**getUserEvents(userId): Promise<EventMember[]>**

Fetch all active event memberships for a user.

## 9. Authorization Architecture

```
UI / Feature
      ↓
Authorization Service (application layer)
      ↓
Repository Interface
      ↓
Firebase Repository (Firestore implementation)
      ↓
Firestore
```

The authorization service uses repository interfaces (not Firestore SDK directly) to check membership.

## 10. Firestore as Security Boundary

Firestore Security Rules enforce access at the database layer.

**Rules are the actual security mechanism — not UI checks.**

UI checks (hidden buttons, disabled fields, route guards) are UX only and must not be relied upon for security.

## 11. Firestore Security Rules

See `firestore.rules` for the actual rules.

### Summary

- **Default:** DENY all access
- **User profiles:** User may read/write only their own profile
- **Organizations:** Authenticated users may read (authorization service verifies membership)
- **Organization memberships:** User may read only their own memberships
- **Events:** Authenticated users may read (authorization service verifies membership)
- **Event memberships:** User may read only their own memberships
- **All writes:** Denied (membership/organization/event management is server-side only)

## 12. Current Roles

The domain model defines roles, but they do **NOT** represent granular permissions yet:

**OrganizationRole:**
- `owner`
- `admin`
- `planner`
- `staff`

**EventRole:**
- `owner`
- `planner`
- `couple`
- `family`
- `staff`
- `viewer`

Example: A user with role `couple` does **NOT** automatically have permission to edit everything.

## 13. Future Permission + Scope Architecture

This will be added later:

```
Role
+
Permission (e.g., "guests" → "manage")
+
Scope (e.g., "all", "bride side", "groom side")
```

Example future permissions:

- Planner: `guests` → `manage` → `all`
- Bride: `guests` → `edit` → `bride side`
- Groom: `guests` → `edit` → `groom side`
- Family: `guests` → `view` → `bride side`

## 14. Current Architecture Compatibility

The current system is designed to remain compatible with future granular permissions:

- Roles are stored in membership records
- Permission definitions will be separate
- Scope definitions will be separate
- Authorization service can be extended to check (role + permission + scope)

## 15. Why Organization Membership Does Not Auto-Grant Event Access

This design choice prevents accidental oversharing:

**Without explicit event membership:**
- An organization could have 50 employees
- One event might only involve 3 specific employees
- Without explicit event membership, all 50 would gain access (wrong!)

**With explicit event membership:**
- Only invited employees are added as `EventMember`
- Access is intentional
- No accidental oversharing

## 16. No Security by UI

Do not rely on:

- Hidden buttons
- Disabled form fields
- Route guards
- React conditions

These are UX helpers only. **Firestore Security Rules are the actual security boundary.**

A determined user could:
- Inspect network requests
- Call Firestore directly
- Modify application code

Firestore Rules protect against all of these.

## 17. Membership Document Lookup Limitation

The current membership ID design uses Firestore-generated IDs:

`organizationMembers/{generatedId}`
`eventMembers/{generatedId}`

This means Firestore Security Rules **cannot directly query** "does this user have membership in org X?"

**Workaround:** The authorization service queries at the application layer.

**Why:** Firestore Security Rules have limited query capabilities. Full collection queries are not available in rules.

**Future improvement:** If needed, we could use a secondary "user membership summary" collection with more efficient lookups. For now, application-level checks are sufficient.

## 18. Membership Uniqueness

Currently, the system does not prevent:

- A user being added to an organization twice
- A user being added to an event twice

**Future:** When invitation/onboarding is implemented, add database constraints or application logic to prevent duplicate (user, organization) and (user, event) combinations.

## 19. Testing Security Rules

Security tests exist in `tests/firestore.rules.test.ts`.

Run tests:

```bash
npm run test:rules
```

This uses the Firebase Emulator and does not require production credentials.

### Test Coverage

1. Unauthenticated user cannot read another user's profile
2. User can read their own profile
3. User cannot update another user's profile
4. User cannot read organization they are not member of
5. Active organization member can read organization
6. User cannot arbitrarily write to organizations
7. User can read their own organization membership
8. User cannot arbitrarily create organization memberships
9. User cannot read event they are not member of
10. Active event member can read event
11. Inactive event member cannot read event
12. User cannot arbitrarily write to events
13. User can read their own event membership
14. User cannot arbitrarily create event memberships

## 20. Authorization Service Usage Example

```typescript
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { FirebaseOrganizationMemberRepository } from '@/services/firebase/repositories/firebaseOrganizationMemberRepository';
import { FirebaseEventMemberRepository } from '@/services/firebase/repositories/firebaseEventMemberRepository';

// Create service with repository dependencies
const authzService = new AuthorizationService(
  new FirebaseOrganizationMemberRepository(),
  new FirebaseEventMemberRepository()
);

// Check organization access
const orgResult = await authzService.canAccessOrganization(userId, organizationId);
if (!orgResult.allowed) {
  console.log('Access denied:', orgResult.reason);
  return;
}

// Check event access
const eventResult = await authzService.canAccessEvent(userId, eventId);
if (!eventResult.allowed) {
  console.log('Access denied:', eventResult.reason);
  return;
}

// Fetch active memberships
const orgs = await authzService.getUserOrganizations(userId);
const events = await authzService.getUserEvents(userId);
```
