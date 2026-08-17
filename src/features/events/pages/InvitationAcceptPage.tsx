import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useInvitationAcceptance } from '@/features/events/hooks/useInvitationAcceptance';
import { personRoleDisplayLabel } from '@/features/events/types/people';
import { eventMemberSideLabel, eventRoleLabel } from '@/lib/labels';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildLoginRedirectUrl } from '@/lib/redirectTarget';

/**
 * `/invitations/:invitationId` — the basic acceptance route.
 *
 * Not wrapped in ProtectedRoute: an unauthenticated visitor needs to be sent
 * through login/signup *with* a way back to this exact URL, which
 * ProtectedRoute's blind redirect to `/login` doesn't provide. Nothing about
 * the invitation is read until the user is authenticated — "do not grant
 * access before acceptance" applies to the preview too.
 */
export function InvitationAcceptPage(): JSX.Element {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { state, accept, reload } = useInvitationAcceptance(invitationId);

  if (authLoading) {
    return (
      <section className="invitation-accept-page">
        <LoadingState label="Loading…" />
      </section>
    );
  }

  if (!user) {
    return <Navigate to={buildLoginRedirectUrl(`/invitations/${invitationId ?? ''}`)} replace />;
  }

  return (
    <section className="invitation-accept-page">
      {state.status === 'loading' && <LoadingState label="Loading invitation…" />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {(state.status === 'preview' || state.status === 'accepting') && (
        <>
          <h1>{state.preview.eventName}</h1>
          <div className="invitation-accept-meta">
            <Badge variant="neutral">{state.preview.invitedEmail}</Badge>
            <Badge variant="accent">
              {personRoleDisplayLabel(state.preview.role, state.preview.side, eventRoleLabel, eventMemberSideLabel)}
            </Badge>
          </div>
          <Card padded className="invitation-accept-notice">
            <p>Accept this invitation to get access to the event.</p>
            <Button onClick={accept} disabled={state.status === 'accepting'}>
              {state.status === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
            </Button>
          </Card>
        </>
      )}

      {state.status === 'accepted' && (
        <Card padded className="invitation-accept-notice">
          <h2>You&apos;re in</h2>
          <p>You now have access to this event.</p>
          <Button onClick={() => navigate(`/events/${state.eventId}`)}>Go to event</Button>
        </Card>
      )}
    </section>
  );
}
