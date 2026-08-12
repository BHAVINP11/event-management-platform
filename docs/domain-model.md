# Domain Model

This document defines the core domain model for Event Management Platform.

## 1. User

A `User` represents a person with an account on the platform.

Fields:
- `id`
- `firstName`
- `lastName`
- `displayName`
- `email`
- `phone`
- `avatarUrl`
- `createdAt`
- `updatedAt`

A single user can belong to multiple organizations and multiple events. A user's role in the system is determined by membership objects, not by separate user types.

## 2. Organization

An `Organization` represents an event planning company or business.

Fields:
- `id`
- `name`
- `slug`
- `logoUrl`
- `description`
- `contactEmail`
- `contactPhone`
- `createdAt`
- `updatedAt`

Organizations manage multiple events and have many members.

## 3. OrganizationMember

`OrganizationMember` connects a `User` to an `Organization` and defines the user's role inside that organization.

Fields:
- `id`
- `organizationId`
- `userId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

Roles:
- `owner`
- `admin`
- `planner`
- `staff`

Memberships are used to determine who can manage organization-level resources, though permission enforcement is not defined at this layer.

## 4. Event

The `Event` is the central domain object.

Fields:
- `id`
- `name`
- `type`
- `description`
- `startDate`
- `endDate`
- `timezone`
- `venueName`
- `venueAddress`
- `organizationId`
- `createdBy`
- `status`
- `createdAt`
- `updatedAt`

An event may optionally belong to an organization via `organizationId`. If `organizationId` is `null`, the event is independently created by a couple or family.

Event types:
- `wedding`
- `social`
- `corporate`
- `private`
- `other`

Event status:
- `draft`
- `active`
- `completed`
- `archived`

## 5. EventMember

`EventMember` connects a `User` to an `Event` and defines the user's role for that event.

Fields:
- `id`
- `eventId`
- `userId`
- `role`
- `status`
- `invitedBy`
- `createdAt`
- `updatedAt`

Roles:
- `owner`
- `planner`
- `couple`
- `family`
- `staff`
- `viewer`

Status values align with membership lifecycle and support pending invitations.

## 6. Why Event is the central domain object

The event is the platform's primary business object because all collaboration, planning, and participation revolve around a specific event. Both organization-backed events and directly created couple/family events use the same `Event` model, ensuring one universal event shape across the product.

## 7. Couple-created event flow

1. A user creates an event with `organizationId = null`.
2. The creating user is added to `EventMember` with role `owner`.
3. The event owner can invite family or planners to the event.

## 8. Planner-created event flow

1. A user creates an event under an organization.
2. The event is saved with `organizationId = organization.id`.
3. The planner user is added to the event as `planner` or `owner`.
4. The planner can invite couples, family, or organization staff.

## 9. Planner + Couple collaboration flow

1. An existing event is created by either a couple or planner.
2. A planner is invited to join the event through `EventMember`.
3. The invited planner gains event-level access while the same event remains a single universal object.

## 10. High-level permission boundaries

This document defines domain shape only. It does not enforce permissions.

Key boundaries:
- Membership objects determine roles and access context.
- Users are generic and are assigned responsibilities through `OrganizationMember` and `EventMember`.
- `Organization` provides a grouping for planner businesses.
- `Event` remains the single source of truth for event management.
