import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventAccess } from '@/features/events/hooks/useEventAccess';
import { EventDetailView } from '@/features/events/types/eventAccess';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';
import { formatDateRange } from '@/lib/date';
import { eventRoleLabel, eventStatusLabel, eventTypeLabel } from '@/lib/labels';

function EventSummary({ event }: { event: EventDetailView }): JSX.Element {
  const dateRange = formatDateRange(event.startDate, event.endDate);

  return (
    <>
      <h1>{event.name}</h1>
      {dateRange && <p className="page-subtitle">{dateRange}</p>}

      <div className="resource-meta" style={{ marginBottom: '2rem' }}>
        <span className={`resource-tag status-${event.status}`}>
          {eventStatusLabel(event.status)}
        </span>
        <span className="resource-tag">{eventTypeLabel(event.type)}</span>
        <span className="resource-tag">{eventRoleLabel(event.role)}</span>
        <span className="resource-tag">{event.organizationName ?? 'Personal event'}</span>
      </div>

      {event.description && <p>{event.description}</p>}

      <div className="resource-notice">
        <h2>Event workspace coming next</h2>
        <p>Guests, functions, budgets, and vendors will live here.</p>
        <Link to="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
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
 * Placeholder event page.
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

      {state.status === 'allowed' && <EventSummary event={state.event} />}

      <style>{resourceStyles}</style>
    </section>
  );
}
