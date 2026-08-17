import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';
import { Task, TaskStatus } from '@/types/task';
import { Expense, PaymentStatus } from '@/types/expense';
import { Vendor, VendorStatus } from '@/types/vendor';
import { Guest } from '@/types/guest';
import { sortFunctionsChronologically } from '@/features/events/services/functionSorting';
import { computeExpenseTotals } from '@/features/events/types/expenses';
import { parseIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';

const ATTENTION_WINDOW_DAYS = 7;

/**
 * `YYYY-MM-DD` in the viewer's local calendar, for the injected `now` —
 * deliberately not `lib/date.ts#isBeforeToday`, which reads the real
 * system clock directly and so can't be driven by a test fixture the way
 * every function in this file needs to be.
 */
function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function isPastRelativeTo(dateValue: string | undefined, now: Date): boolean {
  const parsed = parseIsoDate(dateValue);
  return parsed !== null && localDateKey(parsed) < localDateKey(now);
}

/** Whether a task's due date is close enough (or already overdue) to warrant attention. */
function isTaskDueSoon(task: Task, now: Date): boolean {
  if (task.status === TaskStatus.Completed || task.status === TaskStatus.Cancelled) {
    return false;
  }
  const due = parseIsoDate(task.dueDate);
  if (!due) {
    return false;
  }
  if (isPastRelativeTo(task.dueDate, now)) {
    return true;
  }
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + ATTENTION_WINDOW_DAYS);
  return due.getTime() <= windowEnd.getTime();
}

/**
 * The soonest function/ceremony that hasn't already happened, for the
 * command center's "Next Up" card. Cancelled functions are never
 * surfaced; a function with no date can't be "next" by definition.
 * `null` when nothing qualifies — the caller omits the section rather
 * than showing a placeholder.
 */
export function computeNextUpFunction(functions: readonly EventFunction[], now: Date = new Date()): EventFunction | null {
  const upcoming = functions.filter((fn) => {
    if (fn.status === EventFunctionStatus.Cancelled) {
      return false;
    }
    if (!parseIsoDate(fn.date)) {
      return false;
    }
    return !isPastRelativeTo(fn.date, now);
  });

  const sorted = sortFunctionsChronologically(upcoming);
  return sorted[0] ?? null;
}

export interface AttentionItem {
  key: string;
  label: string;
}

/**
 * "Needs your attention" line items — only ever a count of something
 * already loaded, never a fabricated metric. Empty array means the
 * caller shows the "all caught up" empty state instead.
 */
export function computeAttentionItems(
  tasks: readonly Task[],
  expenses: readonly Expense[],
  vendors: readonly Vendor[],
  now: Date = new Date()
): AttentionItem[] {
  const items: AttentionItem[] = [];

  const dueSoonCount = tasks.filter((task) => isTaskDueSoon(task, now)).length;
  if (dueSoonCount > 0) {
    items.push({ key: 'tasks', label: `${dueSoonCount} task${dueSoonCount === 1 ? '' : 's'} due soon` });
  }

  const pendingExpenseCount = expenses.filter(
    (expense) => expense.paymentStatus === PaymentStatus.Unpaid || expense.paymentStatus === PaymentStatus.PartiallyPaid
  ).length;
  if (pendingExpenseCount > 0) {
    items.push({
      key: 'expenses',
      label: `${pendingExpenseCount} expense${pendingExpenseCount === 1 ? '' : 's'} pending`
    });
  }

  const awaitingVendorCount = vendors.filter(
    (vendor) => vendor.status === VendorStatus.Enquiry || vendor.status === VendorStatus.Shortlisted
  ).length;
  if (awaitingVendorCount > 0) {
    items.push({
      key: 'vendors',
      label:
        awaitingVendorCount === 1
          ? '1 vendor awaiting confirmation'
          : `${awaitingVendorCount} vendors awaiting confirmation`
    });
  }

  return items;
}

export interface SnapshotStat {
  key: string;
  label: string;
  value: string;
}

/** The event snapshot strip — every figure here is a plain count/sum of an already-loaded list. */
export function computeSnapshotStats(
  guests: readonly Guest[],
  functions: readonly EventFunction[],
  expenses: readonly Expense[],
  vendors: readonly Vendor[],
  budgetAmount: number | undefined
): SnapshotStat[] {
  const stats: SnapshotStat[] = [];

  stats.push({ key: 'guests', label: guests.length === 1 ? 'Guest' : 'Guests', value: String(guests.length) });
  stats.push({
    key: 'functions',
    label: functions.length === 1 ? 'Function' : 'Functions',
    value: String(functions.length)
  });

  const totals = computeExpenseTotals(expenses, budgetAmount);
  stats.push({ key: 'planned', label: 'Planned', value: formatCurrency(totals.planned) });
  stats.push({ key: 'expenses', label: expenses.length === 1 ? 'Expense' : 'Expenses', value: String(expenses.length) });
  stats.push({ key: 'vendors', label: vendors.length === 1 ? 'Vendor' : 'Vendors', value: String(vendors.length) });

  return stats;
}
