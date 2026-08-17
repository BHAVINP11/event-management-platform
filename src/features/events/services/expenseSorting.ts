import { Expense } from '@/types/expense';

/**
 * Chronological ordering for an event's expenses, done entirely
 * client-side over the already-loaded list — no new query.
 *
 * `paymentDate` is optional (many expenses are unpaid and never get one),
 * so it can't anchor a useful sort by itself. `createdAt` is always
 * present and reflects the true order expenses were recorded in, so
 * expenses sort most-recently-added first by `createdAt`.
 */
export function sortExpensesByRecency(expenses: readonly Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
