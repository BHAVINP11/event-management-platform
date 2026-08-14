# Vendors

## 1. Purpose

Step 15 adds a simple, event-specific vendor tracker: the caterers,
photographers, decorators, etc. an event owner/planner is considering or
has booked. **A Vendor is event-specific — not a shared marketplace entity
or a vendor account.** There is no vendor login, no cross-event vendor
directory, and no vendor-facing anything; a vendor here is just a record
the planning team keeps about a service provider, scoped entirely to one
event.

## 2. Domain model

`Vendor` (`src/types/vendor.ts`):

```
id, eventId, name, category, phone?, email?, notes?,
status (enquiry | shortlisted | confirmed | cancelled),
createdBy, createdAt, updatedAt
```

Categories (`VendorCategory`): `venue`, `catering`, `decoration`,
`photography`, `videography`, `entertainment`, `transportation`,
`accommodation`, `jewellery`, `makeup`, `invitation`, `other`.

## 3. Repository

`VendorRepository` (`src/repositories/interfaces/vendorRepository.ts`):
`getById`, `create`, `update`, `delete`, `listByEvent`.
`FirebaseVendorRepository` follows the exact shape of
`FirebaseFunctionRepository`/`FirebaseExpenseRepository` — same
`RepositoryDataError`/`RepositoryInfrastructureError` conventions, same
`firestoreMapping.ts` helpers.

Collection: **`vendors/{vendorId}`**, a flat top-level collection carrying
an `eventId` field — not an `events/{eventId}/vendors` subcollection,
consistent with `guests`/`functions`/`expenses`.

`create`/`update`/`delete` exist on the interface and Firebase
implementation for parity with the other repositories, but the client
never calls them — see §4.

## 4. Trusted CRUD

Three callable Cloud Functions, `functions/src/vendors/{createVendor,
updateVendor,deleteVendor}.ts`, are the only way a vendor is ever written.
Firestore rules deny all client writes to `vendors` (see §7); reads go
through the ordinary repository/rules path instead.

Every operation verifies, in this order:

1. **Authenticated** — `context.auth` present, else `unauthenticated`.
2. **Active EventMember** — the caller has an `eventMembers/{eventId}_{uid}`
   document with `status: active` for the *relevant* event (see §7 for
   what "relevant" means for update/delete).
3. **Management role** — `verifyEventManagementAuthority`
   (`functions/src/shared/eventAuthority.ts`) throws
   `event_role_not_allowed` unless the caller's role is `owner` or
   `planner`. The same plain owner/planner gate already used by
   Functions/Ceremonies, Expenses, and Invitations — Vendors have no
   side-scoping, so no new authorization module was needed.

Validation (`functions/src/vendors/shared.ts`): `name` required (1–200
chars); `category` must be one of the twelve valid values; `phone`
(≤30 chars) and `email` (reusing the existing `validateContactEmail`) and
`notes` (≤1000 chars) are optional; `status` defaults to `enquiry` if
omitted, else must be one of the four valid values. The server always
derives `id`, `eventId`, `createdBy`, and the timestamps — a
client-supplied value for any of these is silently ignored.

## 5. Authorization rules

| Role | View | Create / Update / Delete |
| --- | --- | --- |
| Owner | all vendors | yes |
| Planner | all vendors | yes |
| Couple (bride/groom) | all vendors | — (view only) |
| Family | all vendors | — (view only) |
| Staff | all vendors | — (view only) |
| Viewer | all vendors | — (view only) |

Same shape as Functions/Ceremonies and Expenses: no side-scoping, and — per
the spec — no granular vendor permissions yet (e.g. a couple member
managing only vendors they added). Deferred to a future step; see §9.

## 6. Errors

`vendor_not_found` (→ `not-found`) — the requested `vendorId` does not
exist, used by `updateVendor`/`deleteVendor`. All other new codes
(`invalid_name`, `invalid_category`, `invalid_phone`, `invalid_email`,
`invalid_notes`, `invalid_status`, `invalid_event_id`,
`invalid_vendor_id`) are handled by `errorMapping.ts`'s existing
`invalid_*` → `invalid-argument` fallback rule, with no new entries
required.

## 7. Event isolation

**A member of Event A must never access vendors belonging to Event B.**

- **Reads:** the Firestore rule requires
  `isActiveEventMember(resource.data.eventId)` — the *document's own*
  `eventId`, not one the client asserts. A member of event A has no active
  membership document for event B, so the rule fails for event B's
  vendors regardless of what the client's query asks for.
- **Writes (update/delete):** authorization is checked against the
  vendor's ***stored*** `eventId` (loaded from the document itself), never
  a client-supplied value. An owner of event B calling
  `updateVendor`/`deleteVendor` with event A's `vendorId` is checked
  against event A's membership requirement, which they don't have, and
  rejected with `event_access_denied`. Covered by
  `functions/src/__tests__/{createVendor,updateVendor,deleteVendor}.test.ts`
  (`"an owner of a different event cannot ... this event's vendor"`).

## 8. Vendors page

`/events/:eventId/vendors` (`VendorsPage`), reached from a **Vendors**
item in the event workspace navigation (alongside every other module).
Uses the same access check as the workspace Overview before showing
anything.

- Vendors are shown as simple cards: name, phone, email, category,
  status, notes.
- `[All] [Enquiry] [Shortlisted] [Confirmed] [Cancelled]` status filter
  tabs run client-side over the already-loaded list — the read itself is
  unfiltered/unscoped (§5), so this is purely a display convenience, not a
  security boundary.
- **Add/Edit** is one shared `VendorForm`, shown inline (toggled, not a
  separate route) — Name, Category, Status, Phone, Email, Notes. Only
  rendered when `canManage` is true (owner/planner).
  `createVendor`/`updateVendor` independently re-verify the role
  server-side regardless of what the form shows.
- **Delete** asks for confirmation (`window.confirm`) before calling
  `deleteVendor` — no custom modal component introduced for one
  destructive action.
- **UI states**: loading (`LoadingSkeleton`), denied/not-found (the same
  `resource-notice` pattern as the rest of the workspace), error
  (`ErrorState`, friendly message + Retry — `VendorError`/`EventLoadError`
  carry only a friendly message, never a Firestore code or stack trace),
  and two distinct empty states: "No vendors added yet." (no vendors on
  the event at all) vs. "No vendors match this filter." (vendors exist,
  just none in the selected status tab) — plus `[+ Add Vendor]` for
  owner/planner.

## 9. Future possibilities

Once there's real planner feedback to design against: vendor-side
scoping mirroring guests' bride/groom/both, linking a vendor to the
expenses it generates (Step 14), contact history/notes threading, and a
simple way to compare shortlisted vendors side by side. None of these are
hinted at in the current schema beyond the category/status enums already
being extensible lists — see §10 for what's explicitly out of scope for
this step.

## 10. Non-goals (explicitly out of scope for this step)

A vendor marketplace, vendor accounts/logins, vendor payments, contracts,
invoices, quotations, commission tracking, notifications
(email/SMS/WhatsApp), a generic permission engine, and an admin panel.
None of these were implemented, and no scaffolding for them (fields,
flags, empty modules) was added.

## Structure

```
functions/src/shared/eventAuthority.ts   verifyEventManagementAuthority (owner/planner only, reused as-is)
functions/src/vendors/
  shared.ts             field validation, Vendor document builder
  createVendor.ts       verifyEventManagementAuthority, create
  updateVendor.ts       loads existing, verifyEventManagementAuthority(existing.eventId), update
  deleteVendor.ts       loads existing, verifyEventManagementAuthority(existing.eventId), delete

src/types/vendor.ts                                 Vendor, VendorCategory, VendorStatus
src/repositories/interfaces/vendorRepository.ts
src/services/firebase/repositories/firebaseVendorRepository.ts

src/features/events/
  types/vendors.ts                   VendorListData, VendorFormInput
  services/vendorService.ts          read (repository) + write (Cloud Functions)
  hooks/useVendorList.ts
  components/VendorList.tsx           status filter tabs
  components/VendorForm.tsx
  pages/VendorsPage.tsx                /events/:eventId/vendors
```
