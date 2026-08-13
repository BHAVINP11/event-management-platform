import { DashboardEventSummary } from '@/features/dashboard/types/dashboard';
import { parseIsoDate } from '@/lib/date';

/**
 * Predictable dashboard ordering, in three buckets:
 *
 *   1. Upcoming events, earliest start date first.
 *   2. Undated events, alphabetically.
 *   3. Past events, most recently finished first.
 *
 * An event counts as past once its end date (or start date, when there is no
 * end date) is behind `now`.
 */

const upcomingBucket = 0;
const undatedBucket = 1;
const pastBucket = 2;

interface SortableEvent {
  bucket: number;
  time: number;
  event: DashboardEventSummary;
}

const toSortable = (event: DashboardEventSummary, now: Date): SortableEvent => {
  const start = parseIsoDate(event.startDate);
  const end = parseIsoDate(event.endDate);

  if (!start && !end) {
    return { bucket: undatedBucket, time: 0, event };
  }

  const startTime = (start ?? end) as Date;
  const finishTime = (end ?? start) as Date;

  if (finishTime.getTime() < now.getTime()) {
    return { bucket: pastBucket, time: finishTime.getTime(), event };
  }

  return { bucket: upcomingBucket, time: startTime.getTime(), event };
};

export const sortDashboardEvents = (
  events: readonly DashboardEventSummary[],
  now: Date
): DashboardEventSummary[] =>
  events
    .map((event) => toSortable(event, now))
    .sort((a, b) => {
      if (a.bucket !== b.bucket) {
        return a.bucket - b.bucket;
      }

      if (a.bucket === undatedBucket) {
        return a.event.name.localeCompare(b.event.name);
      }

      // Upcoming: soonest first. Past: most recent first.
      const byTime = a.bucket === pastBucket ? b.time - a.time : a.time - b.time;
      return byTime !== 0 ? byTime : a.event.name.localeCompare(b.event.name);
    })
    .map((sortable) => sortable.event);
