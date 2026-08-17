import { useCallback, useEffect, useState } from 'react';
import { organizationAccessService } from '@/app/services';
import { OrganizationDetailView } from '@/features/organizations/types/organizationAccess';
import { AppError, OrganizationError } from '@/lib/appError';

export type OrganizationAccessState =
  | { status: 'loading' }
  | { status: 'allowed'; organization: OrganizationDetailView }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads a single organization after the authorization check has passed. Mirrors `useEventAccess`. */
export function useOrganizationAccess(
  userId: string | null,
  organizationId: string | undefined
): { state: OrganizationAccessState; reload: () => void } {
  const [state, setState] = useState<OrganizationAccessState>({ status: 'loading' });
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
        const result = await organizationAccessService.loadOrganization(userId, organizationId);
        if (!active) {
          return;
        }

        setState(
          result.status === 'allowed'
            ? { status: 'allowed', organization: result.organization }
            : { status: result.status }
        );
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof AppError
                ? error.friendlyMessage
                : new OrganizationError('internal_error', "We couldn't load this organization right now.")
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
