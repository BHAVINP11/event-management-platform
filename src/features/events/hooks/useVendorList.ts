import { useCallback, useEffect, useState } from 'react';
import { vendorService } from '@/app/services';
import { VendorListData } from '@/features/events/types/vendors';
import { AppError, EventLoadError } from '@/lib/appError';

export type VendorListState =
  | { status: 'loading' }
  | { status: 'allowed'; data: VendorListData }
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

/** Loads the Vendors page for an event, using the same access check as the workspace. */
export function useVendorList(
  userId: string | null,
  eventId: string | undefined
): { state: VendorListState; reload: () => void } {
  const [state, setState] = useState<VendorListState>({ status: 'loading' });
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
        const result = await vendorService.listVendors(userId, eventId);
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
