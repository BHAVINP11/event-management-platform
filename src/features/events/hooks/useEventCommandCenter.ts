import { useCallback, useEffect, useState } from 'react';
import { guestService, functionService, expenseService, vendorService, taskService } from '@/app/services';
import {
  AttentionItem,
  SnapshotStat,
  computeAttentionItems,
  computeNextUpFunction,
  computeSnapshotStats
} from '@/features/events/services/eventCommandCenter';
import { EventFunction } from '@/types/eventFunction';
import { AppError, EventLoadError } from '@/lib/appError';

export interface EventCommandCenterData {
  nextUp: EventFunction | null;
  attentionItems: AttentionItem[];
  snapshotStats: SnapshotStat[];
}

export type EventCommandCenterState =
  | { status: 'loading' }
  | { status: 'ready'; data: EventCommandCenterData }
  | { status: 'error'; message: string };

/**
 * Orchestrates the command-center content for Event Overview / Couple
 * Home — "what's next," "what needs attention," and a plain-count
 * snapshot. Reuses the exact same list services Guests/Functions/
 * Expenses/Vendors/Tasks already call from their own pages (each one
 * independently re-verifies access server-side regardless); this hook
 * adds no new backend capability, only a second call site for existing
 * reads. Only fetches once `enabled` — the caller is expected to have
 * already confirmed event access via the existing `useEventAccess`.
 */
export function useEventCommandCenter(
  userId: string | null,
  eventId: string | undefined,
  enabled: boolean
): { state: EventCommandCenterState; reload: () => void } {
  const [state, setState] = useState<EventCommandCenterState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !userId || !eventId) {
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const [guestsResult, functionsResult, expensesResult, vendorsResult, tasksResult] = await Promise.all([
          guestService.listGuests(userId, eventId),
          functionService.listFunctions(userId, eventId),
          expenseService.listExpenses(userId, eventId),
          vendorService.listVendors(userId, eventId),
          taskService.listTasks(userId, eventId)
        ]);
        if (!active) {
          return;
        }

        const guests = guestsResult.status === 'allowed' ? guestsResult.data.guests : [];
        const functions = functionsResult.status === 'allowed' ? functionsResult.data.functions : [];
        const expenses = expensesResult.status === 'allowed' ? expensesResult.data.expenses : [];
        const vendors = vendorsResult.status === 'allowed' ? vendorsResult.data.vendors : [];
        const tasks = tasksResult.status === 'allowed' ? tasksResult.data.tasks : [];
        const budgetAmount = expensesResult.status === 'allowed' ? expensesResult.data.budgetAmount : undefined;

        setState({
          status: 'ready',
          data: {
            nextUp: computeNextUpFunction(functions),
            attentionItems: computeAttentionItems(tasks, expenses, vendors),
            snapshotStats: computeSnapshotStats(guests, functions, expenses, vendors, budgetAmount)
          }
        });
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
  }, [userId, eventId, enabled, attempt]);

  return { state, reload };
}
