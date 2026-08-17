import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DashboardEventSummary } from '@/features/dashboard/types/dashboard';
import { eventStatusBadgeVariant } from '@/lib/badgeVariants';
import { getEventCountdown } from '@/features/events/services/eventCountdown';
import { eventPersonality } from '@/features/events/services/eventPersonality';
import { EventCountdownBadge } from '@/features/events/components/EventCountdownBadge';
import { NextUpCard, AttentionCard } from '@/features/events/components/CommandCenterCards';
import { useEventCommandCenter } from '@/features/events/hooks/useEventCommandCenter';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDateRange } from '@/lib/date';
import { eventStatusLabel, eventTypeLabel } from '@/lib/labels';

/** "What needs my attention, and what's next" for the couple's one primary event — reuses the exact command-center data Event Overview shows. */
function AttentionAndNextUp({ eventId }: { eventId: string }): JSX.Element | null {
  const { user } = useAuth();
  const { state, reload } = useEventCommandCenter(user?.id ?? null, eventId, true);

  if (state.status === 'loading') {
    return <LoadingState label="Loading what needs your attention…" />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={reload} />;
  }

  return (
    <div className="command-row">
      <NextUpCard data={state.data} />
      <AttentionCard data={state.data} />
    </div>
  );
}

/**
 * "This is my event." Shown when the authenticated user has at least one
 * accessible event but no organizations — i.e. they came through the
 * individual/couple onboarding path, not the planner one (see
 * `DashboardPage`). Leads with an event hero built from the event's own
 * existing fields, then the same "what's next / what needs attention"
 * command-center content as Event Overview — no generic CRUD shortcut
 * row, no invented metrics.
 */
export function CoupleHome({
  primaryEvent,
  otherEvents
}: {
  primaryEvent: DashboardEventSummary;
  otherEvents: readonly DashboardEventSummary[];
}): JSX.Element {
  const dateRange = formatDateRange(primaryEvent.startDate, primaryEvent.endDate);
  const venue = [primaryEvent.venueName, primaryEvent.venueAddress].filter(Boolean).join(' — ');
  const countdown = getEventCountdown(primaryEvent.startDate, primaryEvent.endDate);
  const personality = eventPersonality(primaryEvent.type);

  return (
    <>
      <div className={`home-hero event-hero--${personality}`}>
        <div className="home-hero-glow" aria-hidden="true" />
        <div className="home-hero-content">
          <span className="home-hero-eyebrow">Your event</span>
          <h1 className="home-hero-title">{primaryEvent.name}</h1>
          <div className="home-hero-meta">
            <Badge variant="neutral">{eventTypeLabel(primaryEvent.type)}</Badge>
            <Badge variant={eventStatusBadgeVariant(primaryEvent.status)}>
              {eventStatusLabel(primaryEvent.status)}
            </Badge>
            {dateRange && <span>{dateRange}</span>}
            {venue && <span>{venue}</span>}
          </div>
          <div className="home-hero-footer">
            <EventCountdownBadge countdown={countdown} />
            <Link to={`/events/${primaryEvent.id}`}>
              <Button variant="secondary">Open Event Overview</Button>
            </Link>
          </div>
        </div>
      </div>

      <AttentionAndNextUp eventId={primaryEvent.id} />

      {otherEvents.length > 0 && (
        <div className="home-secondary-events">
          <div className="home-section-header">
            <h2>Your Other Events</h2>
          </div>
          <div className="home-event-grid">
            {otherEvents.map((event) => (
              <Card key={event.id} interactive padded className="home-event-card">
                <h3>{event.name}</h3>
                <Link to={`/events/${event.id}`}>
                  <Button variant="secondary" size="sm" fullWidth>
                    Open Event
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
