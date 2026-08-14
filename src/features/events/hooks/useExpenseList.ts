import { useCallback, useEffect, useState } from 'react';
import { expenseService } from '@/app/services';
import { ExpenseListData } from '@/features/events/types/expenses';
import { AppError, EventLoadError } from '@/lib/appError';

export type ExpenseListState =
  | { status: 'loading' }
  | { status: 'allowed'; data: ExpenseListData }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads the Expenses page for an event, using the same access check as the workspace. */
export function useExpenseList(
  userId: string | null,
  eventId: string | undefined
): { state: ExpenseListState; reload: () => void } {
  const [state, setState] = useState<ExpenseListState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!userId || !eventId) {
      setState({ status: 'denied' });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const result = await expenseService.listExpenses(userId, eventId);
        if (!active) {
          return;
        }

        setState(
          result.status === 'allowed' ? { status: 'allowed', data: result.data } : { status: result.status }
        );
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof AppError ? error.friendlyMessage : new EventLoadError().friendlyMessage
          });
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [userId, eventId, attempt]);

  return { state, reload };
}
