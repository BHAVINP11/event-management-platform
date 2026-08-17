import { FormEvent, useState } from 'react';
import { expenseService } from '@/app/services';
import { ExpenseFormInput } from '@/features/events/types/expenses';
import { Expense, ExpenseCategory, PaymentStatus } from '@/types/expense';
import { expenseCategoryLabel, paymentStatusLabel } from '@/lib/labels';
import { ExpenseError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

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
 * Add/edit expense form — the content of the Modal that hosts it. Only
 * mounted for users with `canManage` (owner/planner) — createExpense/
 * updateExpense independently re-verify the role server-side regardless.
 * Paid Amount only appears when Payment Status is "Partially Paid" — for
 * Unpaid/Paid, the server derives the correct paidAmount itself (0 or the
 * full amount) regardless of what this form would otherwise send.
 * `eventId`/`createdBy`/`id`/`createdAt` are never part of this form; the
 * Cloud Function derives or preserves them itself.
 */
export function ExpenseForm({
  eventId,
  expense,
  onSaved,
  onCancel
}: {
  eventId: string;
  expense?: Expense;
  onSaved: (message: string) => void;
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
        onSaved('Expense updated.');
      } else {
        await expenseService.createExpense(eventId, input);
        onSaved('Expense added.');
      }
    } catch (err) {
      setError(err instanceof ExpenseError ? err.friendlyMessage : "We couldn't save this expense right now.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <Input label="Title *" name="title" value={fields.title} onChange={handleChange} required disabled={submitting} />

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Category *"
          name="category"
          value={fields.category}
          onChange={handleChange}
          disabled={submitting}
          options={CATEGORY_OPTIONS}
        />
        <Input
          label="Amount *"
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

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Payment Status"
          name="paymentStatus"
          value={fields.paymentStatus}
          onChange={handleChange}
          disabled={submitting}
          options={STATUS_OPTIONS}
        />
        {fields.paymentStatus === PaymentStatus.PartiallyPaid && (
          <Input
            label="Paid Amount *"
            name="paidAmount"
            type="number"
            min="0"
            step="0.01"
            value={fields.paidAmount}
            onChange={handleChange}
            required
            disabled={submitting}
          />
        )}
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Payment Date"
          name="paymentDate"
          type="date"
          value={fields.paymentDate}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="expense-notes">
          Notes
        </label>
        <textarea
          id="expense-notes"
          name="notes"
          className="field-control"
          rows={3}
          value={fields.notes}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
