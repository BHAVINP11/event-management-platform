import { Expense, PaymentStatus } from '@/types/expense';
import { expenseCategoryLabel, paymentStatusLabel } from '@/lib/labels';
import { paymentStatusBadgeVariant } from '@/lib/badgeVariants';
import { formatCurrency } from '@/lib/currency';
import { formatEventDate } from '@/lib/date';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

function ExpenseRow({
  expense,
  canManage,
  onEdit,
  onDelete
}: {
  expense: Expense;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  const paymentDate = formatEventDate(expense.paymentDate);

  return (
    <Card padded>
      <div className="expense-row">
        <div className="expense-row-primary">
          <h3>{expense.title}</h3>
          {expense.notes && <p>{expense.notes}</p>}
        </div>

        <div className="expense-row-field">
          <span className="expense-row-field-label">Category</span>
          <Badge variant="neutral">{expenseCategoryLabel(expense.category)}</Badge>
        </div>

        <div className="expense-row-field">
          <span className="expense-row-field-label">Status</span>
          <Badge variant={paymentStatusBadgeVariant(expense.paymentStatus)}>
            {paymentStatusLabel(expense.paymentStatus)}
          </Badge>
          {expense.paymentStatus === PaymentStatus.PartiallyPaid && (
            <span className="expense-row-field-note">Paid {formatCurrency(expense.paidAmount)}</span>
          )}
        </div>

        <div className="expense-row-field expense-row-field--date">
          <span className="expense-row-field-label">Amount</span>
          <span>{formatCurrency(expense.amount)}</span>
          {paymentDate && <span className="expense-row-field-note">{paymentDate}</span>}
        </div>

        {canManage && (
          <div className="expense-row-actions">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * The expense rows for `/events/:eventId/expenses`. `expenses` is the
 * already filtered/searched/sorted list; `hasAnyExpenses` distinguishes
 * "no expenses on this event yet" from "no expenses match the current
 * filter/search," which need different empty-state copy.
 */
export function ExpenseList({
  expenses,
  hasAnyExpenses,
  canManage,
  onAdd,
  onEdit,
  onDelete
}: {
  expenses: readonly Expense[];
  hasAnyExpenses: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}): JSX.Element {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title={hasAnyExpenses ? 'No expenses match your search' : 'No expenses added yet'}
        description={
          hasAnyExpenses ? 'Try a different title, category, or filter.' : 'Start tracking your event spending.'
        }
        action={canManage && !hasAnyExpenses ? <Button onClick={onAdd}>+ Add Expense</Button> : undefined}
      />
    );
  }

  return (
    <ul className="expenses-list">
      {expenses.map((expense) => (
        <li key={expense.id}>
          <ExpenseRow
            expense={expense}
            canManage={canManage}
            onEdit={() => onEdit(expense)}
            onDelete={() => onDelete(expense)}
          />
        </li>
      ))}
    </ul>
  );
}
