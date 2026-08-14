import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { ExpenseRepository } from '@/repositories/interfaces/expenseRepository';
import { ExpenseFormInput, ExpenseListAccessResult, computeExpenseTotals } from '@/features/events/types/expenses';
import { EventRole } from '@/types/membership';
import { EventLoadError, ExpenseError } from '@/lib/appError';

interface CreateExpenseCallableInput extends ExpenseFormInput {
  eventId: string;
}

interface CreateExpenseCallableOutput {
  expenseId: string;
}

interface UpdateExpenseCallableInput extends ExpenseFormInput {
  expenseId: string;
}

interface DeleteExpenseCallableInput {
  expenseId: string;
}

interface UpdateEventBudgetCallableInput {
  eventId: string;
  budgetAmount: number;
}

interface UpdateEventBudgetCallableOutput {
  eventId: string;
  budgetAmount: number;
}

const MANAGEMENT_ROLES: readonly EventRole[] = [EventRole.Owner, EventRole.Planner];

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the expense's details don't look right. Please check and try again.",
  invalid_title: 'Please enter a valid title.',
  invalid_category: 'Please choose a valid category.',
  invalid_amount: 'Please enter an amount greater than 0.',
  invalid_payment_status: 'Please choose a valid payment status.',
  invalid_paid_amount: 'Paid amount must be between 0 and the expense amount.',
  invalid_payment_date: 'Please enter a valid payment date.',
  invalid_notes: 'Please shorten the notes.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_expense_id: "We couldn't identify the expense. Please try again.",
  invalid_budget_amount: 'Budget amount must be zero or greater.',
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow managing expenses for this event.",
  expense_not_found: "We couldn't find this expense.",
  conflict: 'This already exists.',
  permission_denied: 'You do not have permission to perform this action.',
  internal_error: 'Something went wrong. Please try again.'
};

/**
 * Cloud Functions can only throw a small fixed set of codes — the
 * application's own code travels separately in `error.details.appCode` (see
 * `functions/src/errorMapping.ts`). That's the code this service keys its
 * messaging off of; the standard Firebase code is only a fallback.
 */
const toExpenseError = (error: unknown): ExpenseError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new ExpenseError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Reads the expense list and event budget through the repository/
 * Firestore-rules boundary; writes go exclusively through the trusted
 * createExpense/updateExpense/deleteExpense/updateEventBudget Cloud
 * Functions, which independently re-verify the caller's role (owner/
 * planner only) regardless of what this service or the UI show.
 *
 * Like Functions/Ceremonies, there is no side-scoping here — every active
 * event member sees every expense and the budget; only who may *manage*
 * them differs.
 */
export class ExpenseService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly expenseRepository: ExpenseRepository
  ) {}

  async listExpenses(userId: string, eventId: string): Promise<ExpenseListAccessResult> {
    if (!userId || !eventId) {
      return { status: 'denied' };
    }

    const access = await this.authorizationService.canAccessEvent(userId, eventId);

    if (!access.allowed) {
      if (access.reason === 'infrastructure_error') {
        throw new EventLoadError();
      }
      return { status: 'denied' };
    }

    try {
      const event = await this.eventRepository.getById(eventId);
      if (!event) {
        return { status: 'notFound' };
      }

      const membership = await this.authorizationService.getEventMembership(userId, eventId);
      const expenses = await this.expenseRepository.listByEvent(eventId);

      return {
        status: 'allowed',
        data: {
          expenses,
          budgetAmount: event.budgetAmount,
          totals: computeExpenseTotals(expenses, event.budgetAmount),
          canManage: Boolean(membership && MANAGEMENT_ROLES.includes(membership.role))
        }
      };
    } catch {
      throw new EventLoadError();
    }
  }

  async createExpense(eventId: string, input: ExpenseFormInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateExpenseCallableInput, CreateExpenseCallableOutput>(
        functions,
        'onCreateExpense'
      );
      const result: HttpsCallableResult<CreateExpenseCallableOutput> = await callable({ eventId, ...input });
      return result.data.expenseId;
    } catch (error) {
      throw toExpenseError(error);
    }
  }

  async updateExpense(expenseId: string, input: ExpenseFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateExpenseCallableInput, { expenseId: string }>(
        functions,
        'onUpdateExpense'
      );
      await callable({ expenseId, ...input });
    } catch (error) {
      throw toExpenseError(error);
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      const callable = httpsCallable<DeleteExpenseCallableInput, { expenseId: string }>(
        functions,
        'onDeleteExpense'
      );
      await callable({ expenseId });
    } catch (error) {
      throw toExpenseError(error);
    }
  }

  async updateBudget(eventId: string, budgetAmount: number): Promise<void> {
    try {
      const callable = httpsCallable<UpdateEventBudgetCallableInput, UpdateEventBudgetCallableOutput>(
        functions,
        'onUpdateEventBudget'
      );
      await callable({ eventId, budgetAmount });
    } catch (error) {
      throw toExpenseError(error);
    }
  }
}
