import { DashboardOrganizationSummary } from '@/features/dashboard/types/dashboard';
import { organizationRoleLabel } from '@/lib/labels';

export function OrganizationSection({
  organizations
}: {
  organizations: readonly DashboardOrganizationSummary[];
}): JSX.Element {
  return (
    <section className="resource-section">
      <div className="resource-section-header">
        <h2>Organizations</h2>
      </div>

      {organizations.length === 0 ? (
        <div className="resource-empty">
          <p>You don&apos;t belong to any organizations yet.</p>
        </div>
      ) : (
        <ul className="resource-list">
          {organizations.map((organization) => (
            <li key={organization.id} className="resource-card">
              <div className="resource-card-body">
                <h3>{organization.name}</h3>
                {organization.description && <p>{organization.description}</p>}
                <div className="resource-meta">
                  <span className="resource-tag">{organizationRoleLabel(organization.role)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
