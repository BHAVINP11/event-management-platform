import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrganizationInvitationAcceptance } from '@/features/organizations/hooks/useOrganizationInvitationAcceptance';
import { organizationRoleLabel } from '@/lib/labels';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildLoginRedirectUrl } from '@/lib/redirectTarget';

/**
 * `/organization-invitations/:invitationId` — the basic acceptance
 * route, mirroring `/invitations/:invitationId` (event invitations)
 * exactly. Not wrapped in ProtectedRoute: an unauthenticated visitor
 * needs to be sent through login/signup *with* a way back to this exact
 * URL. Nothing about the invitation is read until the user is
 * authenticated.
 */
export function OrganizationInvitationAcceptPage(): JSX.Element {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { state, accept, reload } = useOrganizationInvitationAcceptance(invitationId);

  if (authLoading) {
    return (
      <section className="invitation-accept-page">
        <LoadingState label="Loading…" />
      </section>
    );
  }

  if (!user) {
    return <Navigate to={buildLoginRedirectUrl(`/organization-invitations/${invitationId ?? ''}`)} replace />;
  }

  return (
    <section className="invitation-accept-page">
      {state.status === 'loading' && <LoadingState label="Loading invitation…" />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {(state.status === 'preview' || state.status === 'accepting') && (
        <>
          <h1>{state.preview.organizationName}</h1>
          <div className="invitation-accept-meta">
            <Badge variant="neutral">{state.preview.invitedEmail}</Badge>
            <Badge variant="accent">{organizationRoleLabel(state.preview.role)}</Badge>
          </div>
          <Card padded className="invitation-accept-notice">
            <p>Accept this invitation to get access to the organization.</p>
            <Button onClick={accept} disabled={state.status === 'accepting'}>
              {state.status === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
            </Button>
          </Card>
        </>
      )}

      {state.status === 'accepted' && (
        <Card padded className="invitation-accept-notice">
          <h2>You&apos;re in</h2>
          <p>You now have access to this organization.</p>
          <Button onClick={() => navigate(`/organizations/${state.organizationId}`)}>Go to organization</Button>
        </Card>
      )}
    </section>
  );
}
