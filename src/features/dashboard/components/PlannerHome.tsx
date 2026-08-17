import { Link } from 'react-router-dom';
import { DashboardEventSummary } from '@/features/dashboard/types/dashboard';
import { eventStatusBadgeVariant } from '@/lib/badgeVariants';
import { getEventCountdown } from '@/features/events/services/eventCountdown';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateRange } from '@/lib/date';
import { eventStatusLabel, eventTypeLabel } from '@/lib/labels';

/** A short countdown line for a dense card — "6 days to go", not the full hero badge. */
function countdownLabel(event: DashboardEventSummary): string | null {
  const countdown = getEventCountdown(event.startDate, event.endDate);
  if (countdown.status === 'upcoming') {
    return countdown.days === 1 ? '1 day to go' : `${countdown.days} days to go`;
  }
  if (countdown.status === 'in_progress') {
    return 'In progress';
  }
  return null;
}

function EventCard({ event }: { event: DashboardEventSummary }): JSX.Element {
  const dateRange = formatDateRange(event.startDate, event.endDate);
  const countdown = countdownLabel(event);

  return (
    <Card interactive padded className="home-event-card">
      <div>
        <h3>{event.name}</h3>
        {event.organizationName && <p className="home-event-detail">{event.organizationName}</p>}
      </div>

      {dateRange && <p className="home-event-detail">{dateRange}</p>}
      {countdown && <p className="home-event-countdown">{countdown}</p>}

      <div className="home-event-meta">
        <Badge variant="neutral">{eventTypeLabel(event.type)}</Badge>
        <Badge variant={eventStatusBadgeVariant(event.status)}>{eventStatusLabel(event.status)}</Badge>
      </div>

      <Link to={`/events/${event.id}`}>
        <Button variant="secondary" size="sm" fullWidth>
          Open Event
        </Button>
      </Link>
    </Card>
  );
}

/**
 * "I manage my events from here." Shown when the authenticated user
 * belongs to at least one Organization (see `DashboardPage` for exactly
 * how that's decided, and for the shared greeting above this component).
 * Lists every event the planner has access to, whether it belongs to one
 * of their organizations or not — `data.events` already reflects that
 * from `DashboardService`. No guest counts or progress metrics are
 * shown: the existing dashboard read intentionally never enumerates a
 * resource's members (see `DashboardService`'s own docstring), and
 * adding that would mean new, more expensive queries this step is not
 * meant to introduce.
 */
export function PlannerHome({ events }: { events: readonly DashboardEventSummary[] }): JSX.Element {
  return (
    <>
      <div className="home-section-header">
        <h2>Your Events</h2>
        {events.length > 0 && (
          <Link to="/events/new">
            <Button>+ Create Event</Button>
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Nothing planned yet"
          description="Create your first event and start bringing everything together."
          action={
            <Link to="/events/new">
              <Button>Create Event</Button>
            </Link>
          }
        />
      ) : (
        <div className="home-event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  );
}
