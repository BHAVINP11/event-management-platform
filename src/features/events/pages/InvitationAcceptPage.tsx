import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useInvitationAcceptance } from '@/features/events/hooks/useInvitationAcceptance';
import { personRoleDisplayLabel } from '@/features/events/types/people';
import { eventMemberSideLabel, eventRoleLabel } from '@/lib/labels';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';
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
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to={buildLoginRedirectUrl(`/invitations/${invitationId ?? ''}`)} replace />;
  }

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={1} />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {(state.status === 'preview' || state.status === 'accepting') && (
        <>
          <h1>{state.preview.eventName}</h1>
          <div className="resource-meta" style={{ marginBottom: '2rem' }}>
            <span className="resource-tag">{state.preview.invitedEmail}</span>
            <span className="resource-tag">
              {personRoleDisplayLabel(state.preview.role, state.preview.side, eventRoleLabel, eventMemberSideLabel)}
            </span>
          </div>

          <div className="resource-notice">
            <p>Accept this invitation to get access to the event.</p>
            <button type="button" className="btn-primary" onClick={accept} disabled={state.status === 'accepting'}>
              {state.status === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
            </button>
          </div>
        </>
      )}

      {state.status === 'accepted' && (
        <div className="resource-notice">
          <h2>You&apos;re in</h2>
          <p>You now have access to this event.</p>
          <button type="button" className="btn-primary" onClick={() => navigate(`/events/${state.eventId}`)}>
            Go to event
          </button>
        </div>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
