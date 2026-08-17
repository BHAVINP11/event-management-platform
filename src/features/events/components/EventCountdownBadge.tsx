import { EventCountdown } from '@/features/events/services/eventCountdown';

/**
 * The hero's tasteful countdown — derived entirely from the event's own
 * dates (see `getEventCountdown`). Renders nothing for an unscheduled
 * event rather than showing a placeholder.
 */
export function EventCountdownBadge({ countdown }: { countdown: EventCountdown }): JSX.Element | null {
  if (countdown.status === 'unscheduled') {
    return null;
  }

  if (countdown.status === 'in_progress') {
    return <div className="countdown-badge countdown-badge--status">Event in progress</div>;
  }

  if (countdown.status === 'completed') {
    return <div className="countdown-badge countdown-badge--status countdown-badge--completed">Event completed</div>;
  }

  return (
    <div className="countdown-badge countdown-badge--upcoming">
      <span className="countdown-badge-number">{countdown.days}</span>
      <span className="countdown-badge-label">
        {countdown.days === 1 ? 'Day' : 'Days'}
        <br />
        to go
      </span>
    </div>
  );
}
