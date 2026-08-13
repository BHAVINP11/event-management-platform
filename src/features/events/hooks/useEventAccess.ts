import { useCallback, useEffect, useState } from 'react';
import { eventAccessService } from '@/app/services';
import { EventDetailView } from '@/features/events/types/eventAccess';
import { AppError, EventLoadError } from '@/lib/appError';

export type EventAccessState =
  | { status: 'loading' }
  | { status: 'allowed'; event: EventDetailView }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads a single event after the authorization check has passed. */
export function useEventAccess(
  userId: string | null,
  eventId: string | undefined
): { state: EventAccessState; reload: () => void } {
  const [state, setState] = useState<EventAccessState>({ status: 'loading' });
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
        const result = await eventAccessService.loadEvent(userId, eventId);
        if (!active) {
          return;
        }

        setState(
          result.status === 'allowed'
            ? { status: 'allowed', event: result.event }
            : { status: result.status }
        );
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof AppError
                ? error.friendlyMessage
                : new EventLoadError().friendlyMessage
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
