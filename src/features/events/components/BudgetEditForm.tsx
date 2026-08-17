import { FormEvent, useState } from 'react';
import { expenseService } from '@/app/services';
import { ExpenseError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * Budget-editing form — the content of the Modal that hosts it. Only
 * mounted for users with `canManage` (owner/planner) — updateEventBudget
 * independently re-verifies the role server-side regardless. A single
 * field, no accounting workflow.
 */
export function BudgetEditForm({
  eventId,
  budgetAmount,
  onSaved,
  onCancel
}: {
  eventId: string;
  budgetAmount?: number;
  onSaved: (message: string) => void;
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
      onSaved('Budget updated.');
    } catch (err) {
      setError(err instanceof ExpenseError ? err.friendlyMessage : "We couldn't save the budget right now.");
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

      <Input
        label="Budget Amount"
        name="budgetAmount"
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        disabled={submitting}
      />

      <div className="auth-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Budget'}
        </Button>
      </div>
    </form>
  );
}
