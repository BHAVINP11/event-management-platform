import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '@/app/services';
import { DashboardData } from '@/features/dashboard/types/dashboard';
import { AppError, DashboardLoadError } from '@/lib/appError';

export type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardData }
  | { status: 'error'; message: string };

/**
 * Loads dashboard data for the authenticated user.
 *
 * Components consume this hook instead of touching repositories or Firestore.
 */
export function useDashboardData(userId: string | null): {
  state: DashboardState;
  reload: () => void;
} {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setState({ status: 'error', message: new DashboardLoadError().friendlyMessage });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const data = await dashboardService.getDashboardData(userId);
        if (active) {
          setState({ status: 'ready', data });
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof AppError
                ? error.friendlyMessage
                : new DashboardLoadError().friendlyMessage
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
