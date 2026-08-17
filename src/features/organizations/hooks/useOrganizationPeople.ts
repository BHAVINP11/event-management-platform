import { useCallback, useEffect, useState } from 'react';
import { organizationPeopleService } from '@/app/services';
import { OrganizationPeopleData } from '@/features/organizations/types/organizationPeople';
import { AppError, OrganizationError } from '@/lib/appError';

export type OrganizationPeopleState =
  | { status: 'loading' }
  | { status: 'allowed'; data: OrganizationPeopleData }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads the Members page for an organization after the same access check `useOrganizationAccess` uses. */
export function useOrganizationPeople(
  userId: string | null,
  organizationId: string | undefined
): { state: OrganizationPeopleState; reload: () => void } {
  const [state, setState] = useState<OrganizationPeopleState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!userId || !organizationId) {
      setState({ status: 'denied' });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const result = await organizationPeopleService.listPeople(userId, organizationId);
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
            message:
              error instanceof AppError
                ? error.friendlyMessage
                : new OrganizationError('internal_error', "We couldn't load this organization's members right now.")
                    .friendlyMessage
          });
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [userId, organizationId, attempt]);

  return { state, reload };
}
