import { useState } from 'react';
import { EventDetailView } from '@/features/events/types/eventAccess';
import { getEventCountdown } from '@/features/events/services/eventCountdown';
import { eventPersonality } from '@/features/events/services/eventPersonality';
import { hasEventManagementRole } from '@/features/events/services/quickActions';
import { EventCountdownBadge } from '@/features/events/components/EventCountdownBadge';
import { EventSettingsForm } from '@/features/events/components/EventSettingsForm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { IconCalendar, IconMapPin } from '@/components/ui/icons';
import { eventStatusBadgeVariant } from '@/lib/badgeVariants';
import { formatDateRange } from '@/lib/date';
import { eventStatusLabel, eventTypeLabel } from '@/lib/labels';

/**
 * "Edit event" — visible only to the same Owner/Planner tier that gates
 * every other event-management action in this app (reused, not
 * reinterpreted — see `hasEventManagementRole`). Opens `EventSettingsForm`
 * in a modal; `onSaved` refreshes the event data the whole shell reads
 * from (see `AppShell`'s `reload()`), since the hero, EventNav's label,
 * and every event page all derive from the same `useEventAccess` state.
 */
function EditEventButton({ event, onSaved }: { event: EventDetailView; onSaved: () => void }): JSX.Element | null {
  const { show } = useToast();
  const [open, setOpen] = useState(false);

  if (!hasEventManagementRole(event.role)) {
    return null;
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit event
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Event settings">
        <EventSettingsForm
          event={event}
          onCancel={() => setOpen(false)}
          onSaved={(message) => {
            setOpen(false);
            show(message, 'success');
            onSaved();
          }}
        />
      </Modal>
    </>
  );
}

/**
 * The event identity card — the top row of the two-row Event Workspace
 * header (`AppShell` renders it above `EventNav`, and both are wrapped
 * in one sticky, shared-border container so they read as one control
 * area, not two unrelated pieces). Purely an identity/context surface
 * otherwise: no CRUD actions live here — "+ Add" was tried and removed;
 * see the POLISH reports for why.
 *
 * The ~30%-width cover-photo slot (`.event-hero-media` in
 * event-overview.css) renders `event.coverImageUrl` — set via the Edit
 * Event modal's cover-photo upload, absent until an owner/planner sets
 * one.
 *
 * `onEventUpdated` refreshes the shared `useEventAccess` state after a
 * save (see `AppShell`), so the hero's own re-render, the header's
 * context label, and every event page all pick up the change together.
 */
export function EventHero({
  event,
  onEventUpdated
}: {
  event: EventDetailView;
  onEventUpdated: () => void;
}): JSX.Element {
  const dateRange = formatDateRange(event.startDate, event.endDate);
  const venue = [event.venueName, event.venueAddress].filter(Boolean).join(' — ');
  const countdown = getEventCountdown(event.startDate, event.endDate);
  const personality = eventPersonality(event.type);

  return (
    <div className={`event-hero event-hero--${personality}${event.coverImageUrl ? ' event-hero--with-media' : ''}`}>
      <div className="event-hero-glow" aria-hidden="true" />
      <div className="event-hero-body">
        <div className="event-hero-content">
          <div className="event-hero-top-row">
            <div className="event-hero-badges">
              <Badge variant="neutral">{eventTypeLabel(event.type)}</Badge>
              <Badge variant={eventStatusBadgeVariant(event.status)}>{eventStatusLabel(event.status)}</Badge>
            </div>
            <EditEventButton event={event} onSaved={onEventUpdated} />
          </div>

          <h1 className="event-hero-title">{event.name}</h1>

          <div className="event-hero-meta">
            {dateRange && (
              <span className="event-hero-meta-item">
                <IconCalendar /> {dateRange}
              </span>
            )}
            {venue && (
              <span className="event-hero-meta-item">
                <IconMapPin /> {venue}
              </span>
            )}
            {event.organizationName && <span className="event-hero-meta-item">{event.organizationName}</span>}
          </div>

          {event.description && <p className="event-hero-description">{event.description}</p>}

          <div className="event-hero-footer">
            <EventCountdownBadge countdown={countdown} />
          </div>
        </div>

        {event.coverImageUrl && (
          <div className="event-hero-media">
            <img src={event.coverImageUrl} alt="" />
          </div>
        )}
      </div>
    </div>
  );
}
