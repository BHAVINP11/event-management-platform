import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useExpenseList } from '@/features/events/hooks/useExpenseList';
import { ExpenseForm } from '@/features/events/components/ExpenseForm';
import { ExpenseList } from '@/features/events/components/ExpenseList';
import { BudgetEditForm } from '@/features/events/components/BudgetEditForm';
import { expenseService } from '@/app/services';
import { Expense } from '@/types/expense';
import { ExpenseError } from '@/lib/appError';
import { formatCurrency } from '@/lib/currency';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

type FormMode = 'closed' | 'add' | Expense;

function ExpensesNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="resource-notice">
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/dashboard" className="btn-secondary">
        Back to dashboard
      </Link>
    </div>
  );
}

/**
 * `/events/:eventId/expenses` — the event's budget summary and expense
 * list. Same access check as the workspace Overview; Add/Edit/Delete and
 * budget editing are additionally gated by `canManage` (owner/planner),
 * enforced for real by the createExpense/updateExpense/deleteExpense/
 * updateEventBudget Cloud Functions regardless of what this page shows.
 */
export function ExpensesPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useExpenseList(user?.id ?? null, eventId);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingBudget, setEditingBudget] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (expense: Expense): Promise<void> => {
    if (!window.confirm(`Remove "${expense.title}" from this event's expenses?`)) {
      return;
    }

    setActionError(null);
    try {
      await expenseService.deleteExpense(expense.id);
      reload();
    } catch (err) {
      setActionError(
        err instanceof ExpenseError ? err.friendlyMessage : "We couldn't remove this expense right now."
      );
    }
  };

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={2} />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'denied' && (
        <ExpensesNotice
          title="You don't have access to this event"
          body="Ask the event owner to invite you, then try again."
        />
      )}

      {state.status === 'notFound' && (
        <ExpensesNotice
          title="We couldn't find this event"
          body="It may have been removed, or the link may be out of date."
        />
      )}

      {state.status === 'allowed' && eventId && (
        <>
          <div className="resource-section-header">
            <h1>Expenses</h1>
            {state.data.canManage && formMode === 'closed' && (
              <button type="button" className="btn-primary" onClick={() => setFormMode('add')}>
                + Add Expense
              </button>
            )}
          </div>

          {editingBudget ? (
            <BudgetEditForm
              eventId={eventId}
              budgetAmount={state.data.budgetAmount}
              onSaved={() => {
                setEditingBudget(false);
                reload();
              }}
              onCancel={() => setEditingBudget(false)}
            />
          ) : (
            <div className="budget-summary">
              <div className="budget-stat">
                <span className="budget-stat-value">
                  {state.data.budgetAmount !== undefined ? formatCurrency(state.data.budgetAmount) : 'Not set'}
                </span>
                <span className="budget-stat-label">Budget</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-value">{formatCurrency(state.data.totals.planned)}</span>
                <span className="budget-stat-label">Total Planned</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-value">{formatCurrency(state.data.totals.paid)}</span>
                <span className="budget-stat-label">Total Paid</span>
              </div>
              <div className="budget-stat">
                <span className={`budget-stat-value ${(state.data.totals.remaining ?? 0) < 0 ? 'negative' : ''}`}>
                  {state.data.totals.remaining !== null ? formatCurrency(state.data.totals.remaining) : '—'}
                </span>
                <span className="budget-stat-label">Remaining</span>
              </div>
              <div className="budget-stat">
                <span
                  className={`budget-stat-value ${(state.data.totals.remainingAfterPayments ?? 0) < 0 ? 'negative' : ''}`}
                >
                  {state.data.totals.remainingAfterPayments !== null
                    ? formatCurrency(state.data.totals.remainingAfterPayments)
                    : '—'}
                </span>
                <span className="budget-stat-label">Remaining After Payments</span>
              </div>
              {state.data.canManage && (
                <button type="button" className="btn-secondary" onClick={() => setEditingBudget(true)}>
                  Edit Budget
                </button>
              )}
            </div>
          )}

          {formMode !== 'closed' && (
            <ExpenseForm
              eventId={eventId}
              expense={formMode === 'add' ? undefined : formMode}
              onSaved={() => {
                setFormMode('closed');
                reload();
              }}
              onCancel={() => setFormMode('closed')}
            />
          )}

          {actionError && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              {actionError}
            </div>
          )}

          <ExpenseList
            expenses={state.data.expenses}
            canManage={state.data.canManage}
            onEdit={(expense) => setFormMode(expense)}
            onDelete={handleDelete}
          />
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
