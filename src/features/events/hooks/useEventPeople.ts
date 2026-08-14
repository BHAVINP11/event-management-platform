import { useCallback, useEffect, useState } from 'react';
import { eventPeopleService } from '@/app/services';
import { EventPeopleData } from '@/features/events/types/people';
import { AppError, EventLoadError } from '@/lib/appError';

export type EventPeopleState =
  | { status: 'loading' }
  | { status: 'allowed'; data: EventPeopleData }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads the People page for an event after the same access check the workspace uses. */
export function useEventPeople(
  userId: string | null,
  eventId: string | undefined
): { state: EventPeopleState; reload: () => void } {
  const [state, setState] = useState<EventPeopleState>({ status: 'loading' });
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
        const result = await eventPeopleService.listPeople(userId, eventId);
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
