/**
 * Shared building blocks for expense management.
 *
 * createExpense and updateExpense both validate the same fields and build
 * the same document shape, so both live here rather than being duplicated.
 */
import { ValidationError } from '../validation';

export const EXPENSE_CATEGORIES = [
  'venue',
  'catering',
  'decoration',
  'photography',
  'entertainment',
  'transportation',
  'accommodation',
  'jewellery',
  'clothing',
  'invitation',
  'other'
] as const;

export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid'] as const;

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const NOTES_MAX = 1000;

export interface ExpenseFields {
  title: string;
  category: string;
  amount: number;
  paymentStatus: string;
  paidAmount: number;
  paymentDate?: string;
  notes?: string;
}

function validateTitle(title: unknown): string {
  if (!title || typeof title !== 'string') {
    throw new ValidationError('invalid_title', 'Title must be a non-empty string.');
  }

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    throw new ValidationError('invalid_title', `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`);
  }

  return title;
}

function validateCategory(category: unknown): string {
  if (!category || typeof category !== 'string' || !EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    throw new ValidationError('invalid_category', `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
  }

  return category;
}

function validateAmount(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new ValidationError('invalid_amount', 'Amount must be a number.');
  }

  if (amount <= 0) {
    throw new ValidationError('invalid_amount', 'Amount must be greater than 0.');
  }

  return amount;
}

function validatePaymentStatus(paymentStatus: unknown): string {
  if (paymentStatus === undefined || paymentStatus === null) {
    return 'unpaid';
  }

  if (typeof paymentStatus !== 'string' || !PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])) {
    throw new ValidationError('invalid_payment_status', `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}`);
  }

  return paymentStatus;
}

function validatePaymentDate(paymentDate: unknown): string | undefined {
  if (paymentDate === undefined || paymentDate === null) {
    return undefined;
  }

  if (typeof paymentDate !== 'string' || isNaN(new Date(paymentDate).getTime())) {
    throw new ValidationError('invalid_payment_date', 'Payment date must be a valid date string.');
  }

  return paymentDate;
}

function validateNotes(notes: unknown): string | undefined {
  if (notes === undefined || notes === null) {
    return undefined;
  }

  if (typeof notes !== 'string') {
    throw new ValidationError('invalid_notes', 'Notes must be a string.');
  }

  if (notes.length > NOTES_MAX) {
    throw new ValidationError('invalid_notes', `Notes must be at most ${NOTES_MAX} characters.`);
  }

  return notes;
}

/**
 * Derives the authoritative `paidAmount` from `paymentStatus` and `amount`
 * — never trusted directly from the client except for the
 * `partially_paid` case, where the client's figure is validated against
 * the expense's own amount.
 *
 * - unpaid: paidAmount is always 0, regardless of client input.
 * - paid: paidAmount is always the full amount, regardless of client input.
 * - partially_paid: paidAmount is required, must be >= 0 and <= amount.
 */
function resolvePaidAmount(paymentStatus: string, amount: number, paidAmount: unknown): number {
  if (paymentStatus === 'unpaid') {
    return 0;
  }

  if (paymentStatus === 'paid') {
    return amount;
  }

  if (typeof paidAmount !== 'number' || !Number.isFinite(paidAmount)) {
    throw new ValidationError('invalid_paid_amount', 'Paid amount must be a number.');
  }

  if (paidAmount < 0) {
    throw new ValidationError('invalid_paid_amount', 'Paid amount cannot be negative.');
  }

  if (paidAmount > amount) {
    throw new ValidationError('invalid_paid_amount', 'Paid amount cannot exceed the expense amount.');
  }

  return paidAmount;
}

/** Validates the fields common to expense creation and editing. Throws ValidationError. */
export function validateExpenseFields(obj: Record<string, unknown>): ExpenseFields {
  const title = validateTitle(obj.title);
  const category = validateCategory(obj.category);
  const amount = validateAmount(obj.amount);
  const paymentStatus = validatePaymentStatus(obj.paymentStatus);
  const paidAmount = resolvePaidAmount(paymentStatus, amount, obj.paidAmount);
  const paymentDate = validatePaymentDate(obj.paymentDate);
  const notes = validateNotes(obj.notes);

  return { title, category, amount, paymentStatus, paidAmount, paymentDate, notes };
}

/**
 * Builds a Firestore expense document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createExpense passes
 * the authenticated uid and "now"; updateExpense passes the existing
 * document's values, so an edit can never change who created it or when.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export function buildExpenseDocument(
  expenseId: string,
  eventId: string,
  createdBy: string,
  fields: ExpenseFields,
  createdAt: string,
  updatedAt: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: expenseId,
    eventId,
    title: fields.title,
    category: fields.category,
    amount: fields.amount,
    paymentStatus: fields.paymentStatus,
    paidAmount: fields.paidAmount,
    createdBy,
    createdAt,
    updatedAt
  };

  if (fields.paymentDate !== undefined) {
    doc.paymentDate = fields.paymentDate;
  }
  if (fields.notes !== undefined) {
    doc.notes = fields.notes;
  }

  return doc;
}
