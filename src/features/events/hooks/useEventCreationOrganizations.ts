import { useCallback, useEffect, useState } from 'react';
import { eventCreationService } from '@/app/services';
import { EventCreationOrganizationOption } from '@/features/events/types/eventCreation';
import { AppError, EventCreationError } from '@/lib/appError';

export type CreatableOrganizationsState =
  | { status: 'loading' }
  | { status: 'ready'; organizations: EventCreationOrganizationOption[] }
  | { status: 'error'; message: string };

/** Loads the organizations the current user may create events for. */
export function useEventCreationOrganizations(userId: string | null): {
  state: CreatableOrganizationsState;
  reload: () => void;
} {
  const [state, setState] = useState<CreatableOrganizationsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setState({ status: 'ready', organizations: [] });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const organizations = await eventCreationService.getCreatableOrganizations(userId);
        if (active) {
          setState({ status: 'ready', organizations });
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof AppError
                ? error.friendlyMessage
                : new EventCreationError('internal_error', "We couldn't load this page right now.")
                    .friendlyMessage
          });
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [userId, attempt]);

  return { state, reload };
}
