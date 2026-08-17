import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { PlannerHome } from '@/features/dashboard/components/PlannerHome';
import { CoupleHome } from '@/features/dashboard/components/CoupleHome';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * `/dashboard` — the first screen every authenticated user lands on.
 * Renders one of three experiences from the same existing
 * `useDashboardData` read, with no new field or flag to decide between
 * them:
 *
 * - Any active Organization membership → Planner Home ("I manage my
 *   events from here"). Only `createOrganization` (Planner onboarding)
 *   ever creates one, so this is an unambiguous existing signal.
 * - No organizations, but at least one accessible Event → Couple Home
 *   ("this is my event") — the individual-onboarding path always creates
 *   an Event with no Organization.
 * - Neither yet (a brand new account that hasn't finished onboarding) →
 *   the existing "get started" prompt, unchanged in spirit from before
 *   this step.
 */
function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const { state, reload } = useDashboardData(user?.id ?? null);
  const isPlanner = state.status === 'ready' && state.data.organizations.length > 0;
  const isCouple = state.status === 'ready' && !isPlanner && state.data.events.length > 0;

  return (
    <section className="home-page">
      {state.status === 'loading' && <LoadingState label="Loading your dashboard…" />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'ready' && (
        <>
          <h1 className="home-greeting">
            {getGreeting()}
            {user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="home-subtitle">
            {isCouple
              ? "Here's what needs your attention."
              : isPlanner
                ? "Here's what's happening across your events."
                : "Let's get your first event started."}
          </p>

          {isPlanner ? (
            <PlannerHome events={state.data.events} />
          ) : isCouple ? (
            <CoupleHome primaryEvent={state.data.events[0]} otherEvents={state.data.events.slice(1)} />
          ) : (
            <EmptyState
              title="Nothing planned yet"
              description="Create your first event and start bringing everything together."
              action={
                <Link to="/onboarding">
                  <Button>Create Event</Button>
                </Link>
              }
            />
          )}
        </>
      )}
    </section>
  );
}
