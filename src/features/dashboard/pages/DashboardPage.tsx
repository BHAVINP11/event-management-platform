import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { OrganizationSection } from '@/features/dashboard/components/OrganizationSection';
import { EventSection } from '@/features/dashboard/components/EventSection';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

/**
 * The single dashboard for every kind of user.
 *
 * It answers one question — "what do I have access to?" — and adapts to the
 * resources the authenticated user is an active member of. There are no
 * per-persona dashboards.
 */
export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const { state, reload } = useDashboardData(user?.id ?? null);

  const hasNothing =
    state.status === 'ready' &&
    state.data.organizations.length === 0 &&
    state.data.events.length === 0;

  return (
    <section className="resource-page">
      <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ''} 👋</h1>
      <p className="page-subtitle">Everything you have access to, in one place.</p>

      {state.status === 'loading' && <LoadingSkeleton cards={3} />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'ready' && (
        <>
          <OrganizationSection organizations={state.data.organizations} />
          <EventSection events={state.data.events} canCreateEvent={state.data.canCreateEvent} />

          {hasNothing && (
            <div className="resource-notice">
              <h2>Let&apos;s get you set up</h2>
              <p>Tell us what you&apos;re planning and we&apos;ll create your first event.</p>
              <Link to="/onboarding" className="btn-primary">
                Get started
              </Link>
            </div>
          )}
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
