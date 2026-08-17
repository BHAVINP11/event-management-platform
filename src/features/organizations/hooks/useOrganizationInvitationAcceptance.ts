import { useCallback, useEffect, useState } from 'react';
import { organizationInvitationService } from '@/app/services';
import { OrganizationInvitationPreview } from '@/features/organizations/services/organizationInvitationService';
import { AppError, OrganizationError } from '@/lib/appError';

export type OrganizationInvitationAcceptanceState =
  | { status: 'loading' }
  | { status: 'preview'; preview: OrganizationInvitationPreview }
  | { status: 'accepting'; preview: OrganizationInvitationPreview }
  | { status: 'accepted'; organizationId: string }
  | { status: 'error'; message: string };

/**
 * Drives the `/organization-invitations/:invitationId` acceptance page:
 * loads a preview (organization name, invited email, role) and, on
 * request, accepts it. Mirrors `useInvitationAcceptance` exactly.
 *
 * Assumes the caller is authenticated — the page redirects to login
 * first if not. If called while unauthenticated anyway, the Cloud
 * Functions reject with `unauthenticated`, which surfaces as the error
 * state below.
 */
export function useOrganizationInvitationAcceptance(invitationId: string | undefined): {
  state: OrganizationInvitationAcceptanceState;
  accept: () => void;
  reload: () => void;
} {
  const [state, setState] = useState<OrganizationInvitationAcceptanceState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!invitationId) {
      setState({
        status: 'error',
        message: new OrganizationError('invalid_invitation_id', "We couldn't identify the invitation. Please try again.")
          .friendlyMessage
      });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const preview = await organizationInvitationService.getInvitationPreview(invitationId);
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

    organizationInvitationService
      .acceptInvitation(invitationId)
      .then((result) => {
        setState({ status: 'accepted', organizationId: result.organizationId });
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
