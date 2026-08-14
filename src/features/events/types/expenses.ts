import { Expense, ExpenseCategory, PaymentStatus } from '@/types/expense';

/** Computed from the event's (unscoped) expense list — never stored in Firestore. */
export interface ExpenseTotals {
  planned: number;
  paid: number;
  /** budgetAmount - planned. Null when the event has no budget set yet. */
  remaining: number | null;
  /** budgetAmount - paid. Null when the event has no budget set yet. */
  remainingAfterPayments: number | null;
}

export interface ExpenseListData {
  /** Every expense for the event — no side-scoping for this domain. */
  expenses: Expense[];
  /** The event's budget, or undefined if none has been set yet. */
  budgetAmount?: number;
  totals: ExpenseTotals;
  /** Whether the current user may add/edit/remove expenses and edit the budget (owner/planner only). */
  canManage: boolean;
}

export type ExpenseListAccessResult =
  | { status: 'allowed'; data: ExpenseListData }
  | { status: 'denied' }
  | { status: 'notFound' };

/** The editable expense fields, shared by the add and edit forms. */
export interface ExpenseFormInput {
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentStatus: PaymentStatus;
  /** Required only when paymentStatus is PartiallyPaid. */
  paidAmount?: number;
  paymentDate?: string;
  notes?: string;
}

/**
 * Total Planned = sum of every expense's amount.
 * Total Paid = sum of every expense's paidAmount (already the correct
 * figure per status — 0 for unpaid, the full amount for paid, and the
 * validated partial figure for partially_paid; see functions/src/expenses/shared.ts).
 * Remaining/RemainingAfterPayments are null when there is no budget to compare against.
 */
export function computeExpenseTotals(expenses: readonly Expense[], budgetAmount: number | undefined): ExpenseTotals {
  let planned = 0;
  let paid = 0;

  for (const expense of expenses) {
    planned += expense.amount;
    paid += expense.paidAmount;
  }

  return {
    planned,
    paid,
    remaining: budgetAmount === undefined ? null : budgetAmount - planned,
    remainingAfterPayments: budgetAmount === undefined ? null : budgetAmount - paid
  };
}
