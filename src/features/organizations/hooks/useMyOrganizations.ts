import { useCallback, useEffect, useState } from 'react';
import { organizationAccessService } from '@/app/services';
import { MyOrganizationSummary } from '@/features/organizations/services/organizationAccessService';
import { AppError, OrganizationError } from '@/lib/appError';

export type MyOrganizationsState =
  | { status: 'loading' }
  | { status: 'ready'; organizations: MyOrganizationSummary[] }
  | { status: 'error'; message: string };

/** Loads the organizations the current user belongs to, for the `/organizations` index page. */
export function useMyOrganizations(userId: string | null): { state: MyOrganizationsState; reload: () => void } {
  const [state, setState] = useState<MyOrganizationsState>({ status: 'loading' });
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
        const organizations = await organizationAccessService.listMyOrganizations(userId);
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
                : new OrganizationError('internal_error', "We couldn't load your organizations right now.")
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
