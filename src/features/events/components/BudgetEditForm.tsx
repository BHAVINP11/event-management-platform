import { FormEvent, useState } from 'react';
import { expenseService } from '@/app/services';
import { ExpenseError } from '@/lib/appError';

/**
 * Inline budget-editing form, shown only to owner/planner (`canManage`).
 * updateEventBudget independently re-verifies the role server-side
 * regardless. A single field — no accounting workflow.
 */
export function BudgetEditForm({
  eventId,
  budgetAmount,
  onSaved,
  onCancel
}: {
  eventId: string;
  budgetAmount?: number;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [value, setValue] = useState<string>(budgetAmount !== undefined ? String(budgetAmount) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await expenseService.updateBudget(eventId, Number(value));
      onSaved();
    } catch (err) {
      setError(err instanceof ExpenseError ? err.friendlyMessage : "We couldn't save the budget right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="budget-edit-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="budget-amount">Budget Amount</label>
        <input
          id="budget-amount"
          name="budgetAmount"
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
          disabled={submitting}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Budget'}
        </button>
      </div>
    </form>
  );
}
