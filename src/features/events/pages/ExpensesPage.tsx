import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useExpenseList } from '@/features/events/hooks/useExpenseList';
import { ExpenseForm } from '@/features/events/components/ExpenseForm';
import { ExpenseList } from '@/features/events/components/ExpenseList';
import { BudgetEditForm } from '@/features/events/components/BudgetEditForm';
import { sortExpensesByRecency } from '@/features/events/services/expenseSorting';
import { expenseService } from '@/app/services';
import { Expense, ExpenseCategory, PaymentStatus } from '@/types/expense';
import { expenseCategoryLabel } from '@/lib/labels';
import { ExpenseError } from '@/lib/appError';
import { formatCurrency } from '@/lib/currency';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type CategoryFilter = 'all' | ExpenseCategory;
type StatusFilter = 'all' | PaymentStatus;
type FormMode = 'closed' | 'add' | Expense;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: PaymentStatus.Unpaid, label: 'Unpaid' },
  { id: PaymentStatus.PartiallyPaid, label: 'Partially Paid' },
  { id: PaymentStatus.Paid, label: 'Paid' }
];

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  ...Object.values(ExpenseCategory).map((category) => ({ value: category, label: expenseCategoryLabel(category) }))
];

function ExpensesNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <EmptyState
      title={title}
      description={body}
      action={
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

function matchesCategoryFilter(expense: Expense, filter: CategoryFilter): boolean {
  return filter === 'all' || expense.category === filter;
}

function matchesStatusFilter(expense: Expense, filter: StatusFilter): boolean {
  return filter === 'all' || expense.paymentStatus === filter;
}

function matchesSearch(expense: Expense, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  const term = search.trim().toLowerCase();
  return expense.title.toLowerCase().includes(term) || Boolean(expense.notes?.toLowerCase().includes(term));
}

/**
 * `/events/:eventId/expenses` — the event's budget summary and expense
 * list. Same access check as the workspace Overview; Add/Edit/Delete and
 * budget editing are additionally gated by `canManage` (owner/planner),
 * enforced for real by the createExpense/updateExpense/deleteExpense/
 * updateEventBudget Cloud Functions regardless of what this page shows.
 * Search/category/status filters and sorting all run client-side over the
 * already-loaded (already-scoped) list — no new queries.
 */
export function ExpensesPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useExpenseList(user?.id ?? null, eventId);
  const { show: showToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingBudget, setEditingBudget] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleExpenses = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return sortExpensesByRecency(state.data.expenses).filter(
      (expense) =>
        matchesCategoryFilter(expense, categoryFilter) &&
        matchesStatusFilter(expense, statusFilter) &&
        matchesSearch(expense, search)
    );
  }, [state, categoryFilter, statusFilter, search]);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await expenseService.deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Expense removed.', 'success');
      reload();
    } catch (err) {
      showToast(
        err instanceof ExpenseError ? err.friendlyMessage : "We couldn't remove this expense right now.",
        'danger'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="expenses-page">
      {state.status === 'loading' && <LoadingState label="Loading expenses…" />}

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
          <div className="expenses-header">
            <div>
              <h1>Expenses</h1>
              <p className="expenses-subtitle">Track what this event will cost, and what&apos;s already spent.</p>
            </div>
            {state.data.canManage && <Button onClick={() => setFormMode('add')}>+ Add Expense</Button>}
          </div>

          <div className="budget-summary">
            <div className="budget-summary-stats">
              <div className="budget-stat">
                <span className="budget-stat-value">
                  {state.data.budgetAmount !== undefined ? formatCurrency(state.data.budgetAmount) : 'Not set'}
                </span>
                <span className="budget-stat-label">Budget</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-value">{formatCurrency(state.data.totals.planned)}</span>
                <span className="budget-stat-label">Total Expenses</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-value">{formatCurrency(state.data.totals.paid)}</span>
                <span className="budget-stat-label">Total Paid</span>
              </div>
              {state.data.totals.remaining !== null && (
                <div className="budget-stat">
                  <span
                    className={`budget-stat-value ${state.data.totals.remaining < 0 ? 'budget-stat-value--negative' : ''}`}
                  >
                    {formatCurrency(state.data.totals.remaining)}
                  </span>
                  <span className="budget-stat-label">Remaining Budget</span>
                </div>
              )}
            </div>
            {state.data.canManage && (
              <Button variant="secondary" onClick={() => setEditingBudget(true)}>
                Edit Budget
              </Button>
            )}
          </div>

          {state.data.expenses.length > 0 && (
            <div className="expenses-toolbar">
              <div className="expenses-search">
                <Input
                  label="Search"
                  placeholder="Search by title or notes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Tabs tabs={STATUS_TABS} activeId={statusFilter} onChange={(id) => setStatusFilter(id as StatusFilter)} />
              <div className="expenses-category-filter">
                <Select
                  label="Category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                  options={CATEGORY_FILTER_OPTIONS}
                />
              </div>
            </div>
          )}

          <ExpenseList
            expenses={visibleExpenses}
            hasAnyExpenses={state.data.expenses.length > 0}
            canManage={state.data.canManage}
            onAdd={() => setFormMode('add')}
            onEdit={(expense) => setFormMode(expense)}
            onDelete={(expense) => setDeleteTarget(expense)}
          />

          {formMode !== 'closed' && (
            <Modal
              open
              onClose={() => setFormMode('closed')}
              title={formMode === 'add' ? 'Add Expense' : 'Edit Expense'}
            >
              <ExpenseForm
                eventId={eventId}
                expense={formMode === 'add' ? undefined : formMode}
                onSaved={(message) => {
                  setFormMode('closed');
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setFormMode('closed')}
              />
            </Modal>
          )}

          {editingBudget && (
            <Modal open onClose={() => setEditingBudget(false)} title="Edit Budget">
              <BudgetEditForm
                eventId={eventId}
                budgetAmount={state.data.budgetAmount}
                onSaved={(message) => {
                  setEditingBudget(false);
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setEditingBudget(false)}
              />
            </Modal>
          )}

          {deleteTarget && (
            <Modal open onClose={() => setDeleteTarget(null)} title="Remove expense?">
              <p className="expense-confirm-body">
                Remove &ldquo;{deleteTarget.title}&rdquo; from this event&apos;s expenses? This can&apos;t be undone.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                  {deleting ? 'Removing…' : 'Remove Expense'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
