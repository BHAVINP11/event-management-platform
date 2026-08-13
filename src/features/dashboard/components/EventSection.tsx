import { Link } from 'react-router-dom';
import { DashboardEventSummary } from '@/features/dashboard/types/dashboard';
import { formatDateRange } from '@/lib/date';
import { eventRoleLabel, eventStatusLabel, eventTypeLabel } from '@/lib/labels';

function EventCard({ event }: { event: DashboardEventSummary }): JSX.Element {
  const dateRange = formatDateRange(event.startDate, event.endDate);

  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{event.name}</h3>
        {dateRange && <p>{dateRange}</p>}
        <div className="resource-meta">
          <span className={`resource-tag status-${event.status}`}>
            {eventStatusLabel(event.status)}
          </span>
          <span className="resource-tag">{eventTypeLabel(event.type)}</span>
          <span className="resource-tag">{eventRoleLabel(event.role)}</span>
          {event.organizationName && (
            <span className="resource-tag">{event.organizationName}</span>
          )}
        </div>
      </div>
      <Link to={`/events/${event.id}`} className="btn-secondary">
        Open Event
      </Link>
    </li>
  );
}

export function EventSection({
  events,
  canCreateEvent
}: {
  events: readonly DashboardEventSummary[];
  canCreateEvent: boolean;
}): JSX.Element {
  const heading = events.length === 1 ? 'Your Event' : 'Your Events';

  return (
    <section className="resource-section">
      <div className="resource-section-header">
        <h2>{heading}</h2>
        {canCreateEvent && events.length > 0 && (
          <Link to="/events/new" className="btn-primary">
            + Create Event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="resource-empty">
          <p>You don&apos;t have any events yet.</p>
          {canCreateEvent && (
            <p>
              <Link to="/events/new" className="btn-primary">
                + Create Event
              </Link>
            </p>
          )}
        </div>
      ) : (
        <ul className="resource-list">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
