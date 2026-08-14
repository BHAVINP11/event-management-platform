import { useCallback, useEffect, useState } from 'react';
import { functionService } from '@/app/services';
import { FunctionListData } from '@/features/events/types/functions';
import { AppError, EventLoadError } from '@/lib/appError';

export type FunctionListState =
  | { status: 'loading' }
  | { status: 'allowed'; data: FunctionListData }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads the Functions page for an event, using the same access check as the workspace. */
export function useFunctionList(
  userId: string | null,
  eventId: string | undefined
): { state: FunctionListState; reload: () => void } {
  const [state, setState] = useState<FunctionListState>({ status: 'loading' });
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
        const result = await functionService.listFunctions(userId, eventId);
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
