# Firestore Data Model

This document describes the core Firestore persistence architecture for the Event Management Platform.

## 1. Collections

Top-level collections:

- `users`
- `organizations`
- `organizationMembers`
- `events`
- `eventMembers`

## 2. Document structure

### `users/{userId}`
- `id`: string
- `firstName`: string
- `lastName`: string
- `displayName`: string
- `email`: string
- `phone?`: string
- `avatarUrl?`: string
- `createdAt`: string
- `updatedAt`: string

The document ID is the Firebase Authentication UID and is the authoritative user identifier.

### `organizations/{organizationId}`
- `id`: string
- `name`: string
- `slug`: string
- `logoUrl?`: string
- `description?`: string
- `contactEmail`: string
- `contactPhone?`: string
- `createdAt`: string
- `updatedAt`: string

The document ID is the authoritative organization identifier.

### `organizationMembers/{membershipId}`
- `id`: string
- `organizationId`: string
- `userId`: string
- `role`: string
- `status`: string
- `createdAt`: string
- `updatedAt`: string

### `events/{eventId}`
- `id`: string
- `name`: string
- `type`: string
- `description?`: string
- `startDate?`: string
- `endDate?`: string
- `timezone?`: string
- `venueName?`: string
- `venueAddress?`: string
- `organizationId?`: string | null
- `createdBy`: string
- `status`: string
- `createdAt`: string
- `updatedAt`: string

`organizationId` may be `null` for couple-created events.

### `eventMembers/{membershipId}`
- `id`: string
- `eventId`: string
- `userId`: string
- `role`: string
- `status`: string
- `invitedBy?`: string
- `createdAt`: string
- `updatedAt`: string

## 3. Relationships

- `User` is represented by `users/{userId}`.
- `Organization` is represented by `organizations/{organizationId}`.
- `OrganizationMember` connects a user and organization.
- `Event` is represented by `events/{eventId}`.
- `EventMember` connects a user and event.

## 4. Membership architecture

Membership objects are top-level collections:

- `organizationMembers`
- `eventMembers`

This design supports queries such as:

- fetch all organizations for a user
- fetch all events for a user
- fetch members of an organization
- fetch members of an event

By keeping memberships top-level, the schema remains flexible and queryable without nested collection traversal.

## 5. Why membership collections are top-level

Top-level membership collections avoid nested writes and simplify Firestore queries. They allow membership lookup by:

- `userId`
- `organizationId`
- `eventId`

This is important for future access control and user-centric views.

## 6. Event with organization vs event without organization

- `organizationId = null`: event created directly by a couple or family.
- `organizationId = organization.id`: event created within a planner organization.

Both cases use the same `Event` model.

## 7. Document ID rules

The Firestore document ID is authoritative for entity identity.

- `users/{userId}` → `User.id`
- `organizations/{organizationId}` → `Organization.id`
- `organizationMembers/{membershipId}` → `OrganizationMember.id`
- `events/{eventId}` → `Event.id`
- `eventMembers/{membershipId}` → `EventMember.id`

Stored `id` fields are preserved for readability but do not override the document ID.

## 8. Repository architecture

The app uses a repository interface layer at the application boundary and Firebase-specific repository implementations underneath.

### Structure

- `src/repositories/interfaces/*` — Firebase-independent repository contracts.
- `src/services/firebase/repositories/*` — Firebase implementations and Firestore mappings.

Repositories are responsible for converting between Firestore documents and domain models.

## 9. Future permission compatibility

The membership schema is intentionally extensible:

- memberships include `role`
- future permission or scope fields may be added to membership documents
- repository methods do not enforce authorization

This keeps the data model open for planner, couple, family, and guest permission requirements later.

## 10. Security Considerations

### Rules Philosophy

Firestore Security Rules are the actual security boundary and must be enforced at the database layer.

**Default Policy: DENY All Access**

By default, no one can read or write any document. Specific rules grant limited, intentional access.

### Rule Summary

- **User Profiles** (`users/{userId}`):
  - User can read their own profile
  - User can create their own profile (on signup)
  - User can update their own profile
  - No one can delete user profiles via rules
  - Example: User `abc123` can access `users/abc123` but not `users/xyz789`

- **Organizations** (`organizations/{organizationId}`):
  - Authenticated users can read organizations
  - No direct writes allowed (creation/updates handled server-side via Admin SDK)
  - Authorization service verifies membership before application grants access

- **Organization Memberships** (`organizationMembers/{membershipId}`):
  - User can read their own memberships only
  - No direct writes allowed (Admin SDK only)

- **Events** (`events/{eventId`):
  - Authenticated users can read events
  - No direct writes allowed (creation/updates handled server-side)
  - Authorization service verifies membership before application grants access

- **Event Memberships** (`eventMembers/{membershipId`):
  - User can read their own memberships only
  - No direct writes allowed (Admin SDK only)

### Authorization Service Pattern

Firestore Security Rules are simple and intentionally permissive at the collection level.

The actual authorization (membership verification) is delegated to the application layer via the `AuthorizationService`:

1. Rule allows authenticated users to read events
2. Application calls `authorizationService.canAccessEvent(userId, eventId)`
3. Authorization service queries `eventMembers` collection by userId and checks status
4. If active membership exists, application grants access; otherwise, denies

**Why:** Firestore Security Rules cannot efficiently query across multiple documents. A rule cannot easily ask "does this user have an active membership in org X?" Instead, rules provide basic access to collections, and the application layer performs membership verification.

### Membership Lookup Constraints

Current membership document design uses Firestore-generated IDs:

- `organizationMembers/{generatedId}`
- `eventMembers/{generatedId}`

This means:

- Rules cannot directly check membership via path (e.g., `organizationMembers/user123:org456`)
- Application must query the membership collection by userId

**Future optimization:** If access patterns require it, consider:

- Adding a secondary collection like `userMemberships/{userId}/organizations/{organizationId}` for faster lookup
- Using Firestore composite indexes to optimize membership queries
- For now, collection queries are sufficient

### Testing Rules

Security rules are tested via `tests/firestore.rules.test.ts` using the Firebase Rules Unit Testing library.

Run tests:

```bash
npm run test:rules
```

This uses the Firebase Emulator locally and does not require production credentials.

### Security Boundary

**Do Not Rely On:**

- UI route guards (not security)
- Hidden buttons or disabled form fields (not security)
- Application-only checks (not security)

**Security Boundary:**

- Firestore Security Rules (database layer)
- Server-side API (if added later)

### Related Documentation

See `docs/authorization.md` for detailed authorization model documentation.
