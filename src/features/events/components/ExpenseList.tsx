import { Expense, PaymentStatus } from '@/types/expense';
import { expenseCategoryLabel, paymentStatusLabel } from '@/lib/labels';
import { formatCurrency } from '@/lib/currency';
import { formatEventDate } from '@/lib/date';

const statusTagClass: Record<Expense['paymentStatus'], string> = {
  [PaymentStatus.Unpaid]: 'status-draft',
  [PaymentStatus.PartiallyPaid]: 'status-draft',
  [PaymentStatus.Paid]: 'status-active'
};

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
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{expense.title}</h3>
        <p>{formatCurrency(expense.amount)}</p>
        <div className="resource-meta">
          <span className="resource-tag">{expenseCategoryLabel(expense.category)}</span>
          <span className={`resource-tag ${statusTagClass[expense.paymentStatus]}`}>
            {paymentStatusLabel(expense.paymentStatus)}
          </span>
          {expense.paymentStatus === PaymentStatus.PartiallyPaid && (
            <span className="resource-tag">Paid {formatCurrency(expense.paidAmount)}</span>
          )}
          {paymentDate && <span className="resource-tag">{paymentDate}</span>}
        </div>
        {expense.notes && <p>{expense.notes}</p>}
      </div>

      {canManage && (
        <div className="resource-card-actions">
          <button type="button" className="btn-secondary" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-secondary" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The expense rows for `/events/:eventId/expenses`. `expenses` is the full
 * list for the event — no client-side filtering, unlike Guests.
 */
export function ExpenseList({
  expenses,
  canManage,
  onEdit,
  onDelete
}: {
  expenses: readonly Expense[];
  canManage: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}): JSX.Element {
  if (expenses.length === 0) {
    return (
      <div className="resource-empty">
        <p>No expenses added yet.</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          canManage={canManage}
          onEdit={() => onEdit(expense)}
          onDelete={() => onDelete(expense)}
        />
      ))}
    </ul>
  );
}
