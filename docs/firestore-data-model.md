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

## 10. Security considerations

Security rules are not finalized in this step. A placeholder rule set is provided to deny access by default.

Final authorization logic will be implemented once membership and event access rules are defined.
