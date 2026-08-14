# Expenses & Budget

## 1. Purpose

Step 14 adds the platform's third real event module: a simple budget and
expense tracker.

```
Wedding Budget
₹10,00,000

Expenses:
Venue          ₹2,00,000
Catering       ₹3,00,000
Decoration     ₹1,50,000
Photography    ₹80,000

Summary:

Budget:        ₹10,00,000
Planned:       ₹7,30,000
Paid:          ₹5,00,000
Remaining:     ₹2,70,000
```

This is deliberately simple: an event has one budget number, and a flat
list of expenses against it. It is **not** an accounting system — see §9
for what that would mean and why it is explicitly out of scope.

## 2. Domain model

`Expense` (`src/types/expense.ts`):

```
id, eventId, title, category, amount,
paymentStatus (unpaid | partially_paid | paid), paidAmount,
paymentDate?, notes?,
createdBy, createdAt, updatedAt
```

Categories (`ExpenseCategory`): `venue`, `catering`, `decoration`,
`photography`, `entertainment`, `transportation`, `accommodation`,
`jewellery`, `clothing`, `invitation`, `other`.

`paidAmount` is **server-derived**, not a free-form client field — see §5.

## 3. Budget

The budget is a single optional field, `budgetAmount`, added directly to
the existing `Event` document (`src/types/event.ts`) rather than a
separate collection or subcollection — there is nothing else to a Step-14
budget besides "one number the event has." It is `undefined` until an
owner/planner sets one for the first time.

## 4. Repository

`ExpenseRepository` (`src/repositories/interfaces/expenseRepository.ts`):
`getById`, `create`, `update`, `delete`, `listByEvent`.
`FirebaseExpenseRepository` follows the exact shape of
`FirebaseFunctionRepository`/`FirebaseGuestRepository` — same
`RepositoryDataError`/`RepositoryInfrastructureError` conventions, same
`firestoreMapping.ts` helpers (including two new ones added this step,
`getOptionalNumber`/`getRequiredNumber`, for numeric fields no prior domain
needed).

Collection: **`expenses/{expenseId}`**, a flat top-level collection
carrying an `eventId` field — not an `events/{eventId}/expenses`
subcollection, consistent with `guests`/`functions`.

`create`/`update`/`delete` exist on the interface and Firebase
implementation for parity with the other repositories, but the client
never calls them — see §5. The budget is read as part of the ordinary
`EventRepository.getById` (it is just another `Event` field); no separate
budget repository was introduced.

## 5. Trusted CRUD

Four callable Cloud Functions are the only way an expense or the event
budget is ever written:

- `functions/src/expenses/{createExpense,updateExpense,deleteExpense}.ts`
- `functions/src/events/updateEventBudget.ts`

Firestore rules deny all client writes to `expenses` (see §10), and the
`events` collection already denied all client writes before this step;
reads go through the ordinary repository/rules path instead.

Every operation verifies, in this order:

1. **Authenticated** — `context.auth` present, else `unauthenticated`.
2. **Active EventMember** — the caller has an `eventMembers/{eventId}_{uid}`
   document with `status: active` for the *relevant* event (see §10 for
   what "relevant" means for update/delete).
3. **Management role** — `verifyEventManagementAuthority`
   (`functions/src/shared/eventAuthority.ts`) throws
   `event_role_not_allowed` unless the caller's role is `owner` or
   `planner`. The exact same plain owner/planner gate already used by
   Functions/Ceremonies (Step 13) and Invitations (Step 10) — Expenses have
   no side-scoping, so no new authorization module was needed.

Validation (`functions/src/expenses/shared.ts`): `title` required
(1–200 chars); `category` must be one of the eleven valid values; `amount`
must be a number greater than 0; `paymentStatus` defaults to `unpaid` if
omitted, else must be one of the three valid values; `paymentDate` must
parse as a valid date if present; `notes` bounded to 1000 chars. The
server always derives `id`, `eventId`, `createdBy`, and the timestamps — a
client-supplied value for any of these is silently ignored.

### 5.1 `paidAmount` is never trusted directly

`paidAmount` is resolved server-side from `paymentStatus` and `amount`,
not read as a plain client field:

- **unpaid** → `paidAmount` is always `0`, regardless of what the client sends.
- **paid** → `paidAmount` is always the full `amount`, regardless of what the client sends.
- **partially_paid** → the client's `paidAmount` is required, and validated
  `0 <= paidAmount <= amount` (`invalid_paid_amount` otherwise).

This means a client cannot, for example, mark an expense `unpaid` while
also claiming a nonzero `paidAmount` — the server always overrides it to 0.

`updateEventBudget` validates `budgetAmount >= 0`
(`functions/src/validation.ts`'s `validateBudgetAmount`) and patches only
`budgetAmount` + `updatedAt` on the existing event document — it never
touches any other event field (name, dates, venue, etc.).

## 6. Authorization rules

| Role | View | Create / Update / Delete expenses | Edit budget |
| --- | --- | --- | --- |
| Owner | all expenses + budget | yes | yes |
| Planner | all expenses + budget | yes | yes |
| Couple (bride/groom) | all expenses + budget | — (view only) | — |
| Family | all expenses + budget | — (view only) | — |
| Staff | all expenses + budget | — (view only) | — |
| Viewer | all expenses + budget | — (view only) | — |

Same shape as Functions/Ceremonies (Step 13): no side-scoping, no
bride-only or groom-only expenses, no Family editing. Per the spec, these
are explicitly deferred until there's real planner feedback to design
against — see §11.

## 7. Errors

`expense_not_found` (→ `not-found`) — the requested `expenseId` does not
exist, used by `updateExpense`/`deleteExpense`. All other new codes
(`invalid_title`, `invalid_category`, `invalid_amount`,
`invalid_payment_status`, `invalid_paid_amount`, `invalid_payment_date`,
`invalid_notes`, `invalid_event_id`, `invalid_expense_id`,
`invalid_budget_amount`) are handled by `errorMapping.ts`'s existing
`invalid_*` → `invalid-argument` fallback rule, with no new entries
required.

## 8. Calculations

**Never stored in Firestore** — always computed from the (already-loaded)
expense list, by `computeExpenseTotals`
(`src/features/events/types/expenses.ts`):

```
Total Planned  = sum of every expense's amount
Total Paid     = sum of every expense's paidAmount
Remaining              = budgetAmount - Total Planned   (null if no budget set)
Remaining After Payments = budgetAmount - Total Paid    (null if no budget set)
```

Because `paidAmount` is already the correct figure per status (§5.1),
"Total Paid" needs no per-status branching on the client — it is a plain
sum.

Worked example (matches the module's test suite):

```
Budget = 1,000
Expense A = 400, paid            → paidAmount = 400
Expense B = 300, partially_paid  → paidAmount = 100

Total Planned            = 400 + 300 = 700
Total Paid                = 400 + 100 = 500
Remaining                 = 1000 - 700 = 300
Remaining After Payments  = 1000 - 500 = 500
```

## 9. Why online payments are NOT part of this module

"Paid" here means **a manually recorded status**, set by an owner/planner
who chose it in the form — nothing about this module talks to a payment
processor, moves money, or reconciles a bank transaction. Building actual
payment processing would mean: a payment gateway integration, webhook
handling, idempotency and retry logic, PCI-scope considerations, refund
flows, and reconciliation against a ledger — an entirely different (and
much larger) system than "track what I've promised to pay and what I
already have." Recording a manual status is the right scope for a
planner's own bookkeeping; wiring up real payments is a distinct, much
higher-stakes feature that would need its own dedicated design (auth
flows, compliance, failure handling) — exactly the kind of premature scope
this project's steps have consistently deferred (see `docs/guests.md` §10
and `docs/functions.md` §10 for the same reasoning applied elsewhere).

## 10. Event isolation

**A member of Event A must never access expenses (or budget) belonging to
Event B.**

- **Reads:** the Firestore rule requires
  `isActiveEventMember(resource.data.eventId)` — the *document's own*
  `eventId`, not one the client asserts. A member of event A has no active
  membership document for event B, so the rule fails for event B's
  expenses regardless of what the client's query asks for. The budget is
  just an `Event` field, so it is already covered by the existing `events`
  read rule (`isActiveEventMember(eventId)` on the event's own document).
- **Writes (update/delete):** authorization is checked against the
  expense's ***stored*** `eventId` (loaded from the document itself),
  never a client-supplied value. An owner of event B calling
  `updateExpense`/`deleteExpense` with event A's `expenseId` is checked
  against event A's membership requirement, which they don't have, and
  rejected with `event_access_denied`. `updateEventBudget` takes an
  `eventId` directly (there's no separate expense-like document to load
  first), so isolation there is simply "you must have management authority
  over *that* `eventId`" — a client cannot set another event's budget by
  supplying its ID, because they'd need active management membership on
  that event to pass the authority check at all. Covered by
  `functions/src/__tests__/{createExpense,updateExpense,deleteExpense,updateEventBudget}.test.ts`.

## 11. Expenses page

`/events/:eventId/expenses` (`ExpensesPage`), reached from an **Expenses**
item in the event workspace navigation (alongside **Overview**,
**People**, **Guests**, and **Functions**). Uses the same access check as
the workspace Overview before showing anything.

- **Summary**: Budget, Total Planned, Total Paid, Remaining, Remaining
  After Payments (§8). `[Edit Budget]` toggles an inline `BudgetEditForm`
  — a single number field — shown only when `canManage` is true.
- Expenses are shown as simple cards: title, amount, category, payment
  status, paid-so-far (only shown for partially paid), payment date,
  notes.
- **Add/Edit** is one shared `ExpenseForm`, shown inline (toggled, not a
  separate route) — Title, Category, Amount, Payment Status, Paid Amount
  (only rendered when Payment Status is "Partially Paid"), Payment Date,
  Notes. Only rendered when `canManage` is true (owner/planner).
  `createExpense`/`updateExpense` independently re-verify the role and the
  paid-amount rules server-side regardless of what the form shows.
- **Delete** asks for confirmation (`window.confirm`) before calling
  `deleteExpense` — no custom modal component introduced for one
  destructive action.
- **UI states**: loading (`LoadingSkeleton`), denied/not-found (the same
  `resource-notice` pattern as the rest of the workspace), error
  (`ErrorState`, friendly message + Retry — `ExpenseError`/`EventLoadError`
  carry only a friendly message, never a Firestore code or stack trace),
  and the empty state: "No expenses added yet." (plus `[+ Add Expense]`
  for owner/planner).

## 12. Non-goals (explicitly out of scope for this step)

Online payments, subscriptions, billing, invoices, GST/tax, accounting,
bank integration, payment gateways, vendor management, receipts/file
attachments, financial reports, charts, currency conversion,
notifications (WhatsApp/SMS/email), and granular per-expense permissions
(bride-only expenses, groom-only expenses, Family editing). None of these
were implemented, and no scaffolding for them (fields, flags, empty
modules) was added.

**Future possibilities**, once there's real planner feedback to design
against: side-scoped expenses (mirroring guests' bride/groom/both), a
vendor entity expenses could reference, receipt/file attachments, a
"paid by" field distinguishing who fronted the money, and simple
CSV export. None of these are hinted at in the current schema beyond the
category/status enums already being extensible lists.

## 13. Architecture

Same shape as Functions/Ceremonies (Step 13):

```
Expenses page → ExpenseService (read)  → Repository Interfaces      → Firebase Repositories → Firestore
Add/Edit/Del  → ExpenseService (write) → Callable Cloud Functions   → Admin SDK             → Firestore
Edit Budget   → ExpenseService (write) → updateEventBudget          → Admin SDK             → Firestore (Event doc)
```

`ExpenseService` (`src/features/events/services/expenseService.ts`) is one
class handling expense reads/writes and budget reads/writes, mirroring
`FunctionService`/`GuestService`. React components never import Firestore
or a Firebase repository; `useExpenseList` (hook) and
`ExpenseForm`/`ExpenseList`/`BudgetEditForm` (components) only ever talk
to `ExpenseService`.

## Structure

```
functions/src/shared/eventAuthority.ts   verifyEventManagementAuthority (owner/planner only, reused as-is)
functions/src/validation.ts              + validateBudgetAmount
functions/src/expenses/
  shared.ts             field validation (incl. paidAmount resolution), Expense document builder
  createExpense.ts       verifyEventManagementAuthority, create
  updateExpense.ts       loads existing, verifyEventManagementAuthority(existing.eventId), update
  deleteExpense.ts       loads existing, verifyEventManagementAuthority(existing.eventId), delete
functions/src/events/updateEventBudget.ts   verifyEventManagementAuthority, patches Event.budgetAmount only

src/types/expense.ts                                Expense, ExpenseCategory, PaymentStatus
src/types/event.ts                                  + budgetAmount? field
src/repositories/interfaces/expenseRepository.ts
src/services/firebase/repositories/firebaseExpenseRepository.ts
src/services/firebase/repositories/firestoreMapping.ts   + getOptionalNumber, getRequiredNumber

src/features/events/
  types/expenses.ts                  ExpenseListData, ExpenseFormInput, computeExpenseTotals
  services/expenseService.ts         read (repository) + write (Cloud Functions) + budget
  hooks/useExpenseList.ts
  components/ExpenseList.tsx
  components/ExpenseForm.tsx          Paid Amount shown only for partially_paid
  components/BudgetEditForm.tsx
  pages/ExpensesPage.tsx               /events/:eventId/expenses

src/lib/currency.ts                    formatCurrency (₹, Indian digit grouping, no conversion)
```
