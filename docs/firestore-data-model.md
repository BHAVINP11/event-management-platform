# Firestore Data Model

## Collections

Top-level collections are `users`, `organizations`, `organizationMembers`, `events`, and `eventMembers`.

## Document IDs

The Firestore document ID is authoritative for every entity:

- `users/{userId}` — Firebase Authentication UID
- `organizations/{organizationId}` — organization ID
- `events/{eventId}` — event ID
- `organizationMembers/{organizationId}_{userId}` — organization membership ID
- `eventMembers/{eventId}_{userId}` — event membership ID

Membership IDs use a fixed underscore separator and are constructed by `src/repositories/membershipIds.ts`. The stored membership `id` field always equals this deterministic document ID.

This makes the relationship unique at the persistence layer: an organization/user pair and an event/user pair each have exactly one document path. Repositories use transactions and surface a conflict instead of overwriting an existing membership.

## Membership documents

`organizationMembers/{organizationId}_{userId}` contains `id`, `organizationId`, `userId`, `role`, `status`, `createdAt`, and `updatedAt`.

`eventMembers/{eventId}_{userId}` contains the same relationship fields plus optional `invitedBy`.

Membership collections remain top-level so repositories can list a user's organizations/events or a resource's members. Client-side writes are intentionally denied; future controlled server workflows will manage invitations and lifecycle changes.

## Security model

Firestore Security Rules look up the deterministic membership path and require `status == "active"` before allowing a read of its organization or event. Rules, not application-level checks, are the data-security boundary. Firestore queries are not filters: any client query must be provably permitted for all possible results.

## Repository architecture

The repository contracts under `src/repositories/interfaces` are Firebase-independent. Firebase implementations under `src/services/firebase/repositories` map Firestore documents to the plain domain types in `src/types`.
