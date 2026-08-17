import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventAccess } from '@/features/events/hooks/useEventAccess';
import { EventCommandCenterData, useEventCommandCenter } from '@/features/events/hooks/useEventCommandCenter';
import { NextUpCard, AttentionCard } from '@/features/events/components/CommandCenterCards';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

function EventSnapshot({ data }: { data: EventCommandCenterData }): JSX.Element {
  return (
    <div className="event-snapshot">
      {data.snapshotStats.map((stat) => (
        <div className="event-snapshot-stat" key={stat.key}>
          <span className="event-snapshot-value">{stat.value}</span>
          <span className="event-snapshot-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

function CommandCenter({ userId, eventId }: { userId: string | null; eventId: string }): JSX.Element {
  const { state, reload } = useEventCommandCenter(userId, eventId, true);

  if (state.status === 'loading') {
    return <LoadingState label="Loading event activity…" />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={reload} />;
  }

  return (
    <>
      <div className="command-row">
        <NextUpCard data={state.data} />
        <AttentionCard data={state.data} />
      </div>

      <div className="overview-section-header">
        <h2>Event Snapshot</h2>
      </div>
      <EventSnapshot data={state.data} />
    </>
  );
}

function EventNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <EmptyState
      title={title}
      description={body}
      action={
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

/**
 * The `/events/:eventId` route — the event's command center. The hero
 * (event identity: name, dates, venue, status, countdown) now renders
 * one level up in `AppShell`, directly above `EventNav`, so it's the
 * first thing inside the Event Workspace regardless of which event page
 * happens to be active — see `AppShell`'s doc comment. This page renders
 * only what's specific to Overview: "Next Up" (the soonest function),
 * "Needs Attention" (tasks due soon / pending expenses / vendors
 * awaiting confirmation), and a plain-count snapshot.
 *
 * Access is decided by `EventAccessService` before the event is read, so
 * the URL cannot be used to reach an event the user is not an active
 * member of. Firestore Security Rules enforce the same boundary
 * independently. The command-center data reuses the same
 * guest/function/expense/vendor/task list services their own pages already
 * call (see `useEventCommandCenter`) — no new backend capability, just a
 * second call site for existing reads.
 */
export function EventWorkspacePage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useEventAccess(user?.id ?? null, eventId);

  return (
    <section className="overview-page">
      {state.status === 'loading' && <LoadingState label="Loading event…" />}

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

      {state.status === 'allowed' && eventId && <CommandCenter userId={user?.id ?? null} eventId={eventId} />}
    </section>
  );
}
