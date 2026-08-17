import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyOrganizations } from '@/features/organizations/hooks/useMyOrganizations';
import { organizationRoleLabel } from '@/lib/labels';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

/**
 * `/organizations` — the entry point for organization/planner management.
 * If the user belongs to exactly one organization, skips straight to it
 * (mirrors how `/profile` needs no picker — there is exactly one thing
 * to manage in the common case). With more than one, lists them for the
 * user to choose; with none, explains that organizations come from
 * planner onboarding rather than fabricating a "create organization"
 * entry point here (that flow already exists in onboarding and isn't
 * duplicated).
 */
export function OrganizationsIndexPage(): JSX.Element {
  const { user } = useAuth();
  const { state } = useMyOrganizations(user?.id ?? null);

  if (state.status === 'loading') {
    return (
      <section className="organizations-page">
        <LoadingState label="Loading your organizations…" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="organizations-page">
        <ErrorState message={state.message} onRetry={() => window.location.reload()} />
      </section>
    );
  }

  if (state.organizations.length === 1) {
    return <Navigate to={`/organizations/${state.organizations[0].organizationId}`} replace />;
  }

  return (
    <section className="organizations-page">
      <h1>Organizations</h1>
      <p className="organizations-subtitle">Manage the organizations you belong to.</p>

      {state.organizations.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          description="Organizations are created during planner onboarding."
        />
      ) : (
        <ul className="organizations-list">
          {state.organizations.map((organization) => (
            <li key={organization.organizationId}>
              <Link to={`/organizations/${organization.organizationId}`} className="organizations-list-link">
                <Card interactive padded>
                  <div className="organizations-list-row">
                    <h3>{organization.name}</h3>
                    <Badge variant="neutral">{organizationRoleLabel(organization.role)}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
