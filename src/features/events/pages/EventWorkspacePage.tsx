import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventAccess } from '@/features/events/hooks/useEventAccess';
import { EventDetailView } from '@/features/events/types/eventAccess';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';
import { formatDateRange } from '@/lib/date';
import { eventRoleLabel, eventStatusLabel, eventTypeLabel } from '@/lib/labels';

/**
 * Future workspace sections. Only Overview, People, Guests, Functions, and
 * Expenses have real pages so far — the rest are navigation placeholders
 * so the eventual layout is visible without building their data models yet.
 */
const UPCOMING_WORKSPACE_SECTIONS = ['Vendors', 'Tasks'];

function EventWorkspaceNav({ eventId }: { eventId: string }): JSX.Element {
  return (
    <ul className="event-nav">
      <li className="event-nav-item active">Overview</li>
      <li className="event-nav-item">
        <Link to={`/events/${eventId}/people`}>People</Link>
      </li>
      <li className="event-nav-item">
        <Link to={`/events/${eventId}/guests`}>Guests</Link>
      </li>
      <li className="event-nav-item">
        <Link to={`/events/${eventId}/functions`}>Functions</Link>
      </li>
      <li className="event-nav-item">
        <Link to={`/events/${eventId}/expenses`}>Expenses</Link>
      </li>
      {UPCOMING_WORKSPACE_SECTIONS.map((section) => (
        <li key={section} className="event-nav-item disabled">
          {section}
          <span className="event-nav-soon">Soon</span>
        </li>
      ))}
    </ul>
  );
}

function EventOverview({ event }: { event: EventDetailView }): JSX.Element {
  const dateRange = formatDateRange(event.startDate, event.endDate);
  const venue = [event.venueName, event.venueAddress].filter(Boolean).join(' — ');

  return (
    <dl className="event-overview-grid">
      <div className="event-overview-field">
        <dt>Event type</dt>
        <dd>{eventTypeLabel(event.type)}</dd>
      </div>

      <div className="event-overview-field">
        <dt>Date</dt>
        <dd>{dateRange ?? 'Not scheduled yet'}</dd>
      </div>

      {venue && (
        <div className="event-overview-field">
          <dt>Venue</dt>
          <dd>{venue}</dd>
        </div>
      )}

      <div className="event-overview-field">
        <dt>Status</dt>
        <dd>{eventStatusLabel(event.status)}</dd>
      </div>

      <div className="event-overview-field">
        <dt>Your role</dt>
        <dd>{eventRoleLabel(event.role)}</dd>
      </div>

      <div className="event-overview-field">
        <dt>Organization</dt>
        <dd>{event.organizationName ?? 'Personal event'}</dd>
      </div>

      {event.description && (
        <div className="event-overview-field" style={{ gridColumn: '1 / -1' }}>
          <dt>Description</dt>
          <dd>{event.description}</dd>
        </div>
      )}
    </dl>
  );
}

/**
 * The event workspace shell: header, section navigation, and the Overview
 * page. Every other section is a labeled placeholder — no data model or
 * feature behind it yet.
 */
function EventWorkspace({ event }: { event: EventDetailView }): JSX.Element {
  const dateRange = formatDateRange(event.startDate, event.endDate);

  return (
    <>
      <div className="event-header">
        <h1>{event.name}</h1>
        <p className="page-subtitle">
          {dateRange ?? 'Not scheduled yet'} · {eventStatusLabel(event.status)}
        </p>
      </div>

      <EventWorkspaceNav eventId={event.id} />

      <EventOverview event={event} />
    </>
  );
}

function EventNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="resource-notice">
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/dashboard" className="btn-secondary">
        Back to dashboard
      </Link>
    </div>
  );
}

/**
 * The `/events/:eventId` route.
 *
 * Access is decided by AuthorizationService before the event is read, so the
 * URL cannot be used to reach an event the user is not an active member of.
 * Firestore Security Rules enforce the same boundary independently.
 */
export function EventWorkspacePage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useEventAccess(user?.id ?? null, eventId);

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={1} />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'denied' && (
        <EventNotice
          title="You don't have access to this event"
          body="Ask the event owner to invite you, then try again."
        />
      )}

      {state.status === 'notFound' && (
        <EventNotice
          title="We couldn't find this event"
          body="It may have been removed, or the link may be out of date."
        />
      )}

      {state.status === 'allowed' && <EventWorkspace event={state.event} />}

      <style>{resourceStyles}</style>
    </section>
  );
}
