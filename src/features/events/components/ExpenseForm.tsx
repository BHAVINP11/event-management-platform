import { FormEvent, useState } from 'react';
import { expenseService } from '@/app/services';
import { ExpenseFormInput } from '@/features/events/types/expenses';
import { Expense, ExpenseCategory, PaymentStatus } from '@/types/expense';
import { expenseCategoryLabel, paymentStatusLabel } from '@/lib/labels';
import { ExpenseError } from '@/lib/appError';

const CATEGORY_OPTIONS = Object.values(ExpenseCategory).map((category) => ({
  value: category,
  label: expenseCategoryLabel(category)
}));

const STATUS_OPTIONS = Object.values(PaymentStatus).map((status) => ({
  value: status,
  label: paymentStatusLabel(status)
}));

interface ExpenseFormFields {
  title: string;
  category: ExpenseCategory;
  amount: string;
  paymentStatus: PaymentStatus;
  paidAmount: string;
  paymentDate: string;
  notes: string;
}

const toFields = (expense: Expense | undefined): ExpenseFormFields => ({
  title: expense?.title ?? '',
  category: expense?.category ?? ExpenseCategory.Other,
  amount: expense ? String(expense.amount) : '',
  paymentStatus: expense?.paymentStatus ?? PaymentStatus.Unpaid,
  paidAmount: expense && expense.paymentStatus === PaymentStatus.PartiallyPaid ? String(expense.paidAmount) : '',
  paymentDate: expense?.paymentDate ?? '',
  notes: expense?.notes ?? ''
});

const toInput = (fields: ExpenseFormFields): ExpenseFormInput => ({
  title: fields.title,
  category: fields.category,
  amount: Number(fields.amount),
  paymentStatus: fields.paymentStatus,
  ...(fields.paymentStatus === PaymentStatus.PartiallyPaid && { paidAmount: Number(fields.paidAmount) }),
  ...(fields.paymentDate && { paymentDate: fields.paymentDate }),
  ...(fields.notes && { notes: fields.notes })
});

/**
 * Add/edit expense form. Only mounted for users with `canManage`
 * (owner/planner) — createExpense/updateExpense independently re-verify
 * the role server-side regardless. Paid Amount only appears when Payment
 * Status is "Partially Paid" — for Unpaid/Paid, the server derives the
 * correct paidAmount itself (0 or the full amount) regardless of what this
 * form would otherwise send. `eventId`/`createdBy`/`id`/`createdAt` are
 * never part of this form; the Cloud Function derives or preserves them
 * itself.
 */
export function ExpenseForm({
  eventId,
  expense,
  onSaved,
  onCancel
}: {
  eventId: string;
  expense?: Expense;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<ExpenseFormFields>(toFields(expense));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input = toInput(fields);
      if (expense) {
        await expenseService.updateExpense(expense.id, input);
      } else {
        await expenseService.createExpense(eventId, input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ExpenseError ? err.friendlyMessage : "We couldn't save this expense right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="expense-title">Title *</label>
        <input
          id="expense-title"
          name="title"
          type="text"
          value={fields.title}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="expense-category">Category *</label>
          <select
            id="expense-category"
            name="category"
            value={fields.category}
            onChange={handleChange}
            disabled={submitting}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="expense-amount">Amount *</label>
          <input
            id="expense-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={fields.amount}
            onChange={handleChange}
            required
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="expense-payment-status">Payment Status</label>
          <select
            id="expense-payment-status"
            name="paymentStatus"
            value={fields.paymentStatus}
            onChange={handleChange}
            disabled={submitting}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {fields.paymentStatus === PaymentStatus.PartiallyPaid && (
          <div className="form-group">
            <label htmlFor="expense-paid-amount">Paid Amount *</label>
            <input
              id="expense-paid-amount"
              name="paidAmount"
              type="number"
              min="0"
              step="0.01"
              value={fields.paidAmount}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="expense-payment-date">Payment Date</label>
        <input
          id="expense-payment-date"
          name="paymentDate"
          type="date"
          value={fields.paymentDate}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="expense-notes">Notes</label>
        <textarea
          id="expense-notes"
          name="notes"
          rows={3}
          value={fields.notes}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}
