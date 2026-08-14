import { useCallback, useEffect, useState } from 'react';
import { invitationService } from '@/app/services';
import { InvitationPreview } from '@/features/events/services/invitationService';
import { AppError, InvitationError } from '@/lib/appError';

export type InvitationAcceptanceState =
  | { status: 'loading' }
  | { status: 'preview'; preview: InvitationPreview }
  | { status: 'accepting'; preview: InvitationPreview }
  | { status: 'accepted'; eventId: string }
  | { status: 'error'; message: string };

/**
 * Drives the `/invitations/:invitationId` acceptance page: loads a preview
 * (event name, invited email, role) and, on request, accepts it.
 *
 * Assumes the caller is authenticated — the page redirects to login first if
 * not. If called while unauthenticated anyway, the Cloud Functions reject
 * with `unauthenticated`, which surfaces as the error state below.
 */
export function useInvitationAcceptance(invitationId: string | undefined): {
  state: InvitationAcceptanceState;
  accept: () => void;
  reload: () => void;
} {
  const [state, setState] = useState<InvitationAcceptanceState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!invitationId) {
      setState({ status: 'error', message: new InvitationError('invalid_invitation_id', "We couldn't identify the invitation. Please try again.").friendlyMessage });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const preview = await invitationService.getInvitationPreview(invitationId);
        if (active) {
          setState({ status: 'preview', preview });
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof AppError ? error.friendlyMessage : 'Something went wrong. Please try again.'
          });
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [invitationId, attempt]);

  const accept = useCallback(() => {
    if (!invitationId || state.status !== 'preview') {
      return;
    }

    const { preview } = state;
    setState({ status: 'accepting', preview });

    invitationService
      .acceptInvitation(invitationId)
      .then((result) => {
        setState({ status: 'accepted', eventId: result.eventId });
      })
      .catch((error: unknown) => {
        setState({
          status: 'error',
          message: error instanceof AppError ? error.friendlyMessage : 'Something went wrong. Please try again.'
        });
      });
  }, [invitationId, state]);

  return { state, accept, reload };
}
