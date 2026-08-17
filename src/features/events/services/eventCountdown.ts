import { parseIsoDate } from '@/lib/date';

export type EventCountdown =
  | { status: 'unscheduled' }
  | { status: 'upcoming'; days: number }
  | { status: 'in_progress' }
  | { status: 'completed' };

/** `YYYY-MM-DD` in the viewer's local calendar — see `src/lib/date.ts#isBeforeToday` for the same reasoning. */
function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

/** Whole calendar days between two `YYYY-MM-DD` keys, computed via UTC midnights so DST can't skew it by an hour. */
function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

/**
 * A tasteful countdown for the Event Overview hero, derived entirely from
 * the event's own `startDate`/`endDate` (already loaded — no new read).
 * Compares calendar dates, not exact timestamps, so an event reads as
 * "in progress" for its entire start day rather than flipping to
 * "completed" the moment its start time ticks past — the field is a
 * `datetime-local` value, not a bare date, but a countdown only needs
 * day-level granularity. `now` is injectable for tests, mirroring
 * `DashboardService`'s own `now: Date = new Date()` convention.
 */
export function getEventCountdown(
  startDate: string | undefined,
  endDate: string | undefined,
  now: Date = new Date()
): EventCountdown {
  const start = parseIsoDate(startDate);
  if (!start) {
    return { status: 'unscheduled' };
  }

  const end = parseIsoDate(endDate) ?? start;
  const effectiveEnd = end.getTime() >= start.getTime() ? end : start;

  const todayKey = localDateKey(now);
  const startKey = localDateKey(start);
  const endKey = localDateKey(effectiveEnd);

  if (todayKey < startKey) {
    return { status: 'upcoming', days: daysBetween(todayKey, startKey) };
  }

  if (todayKey > endKey) {
    return { status: 'completed' };
  }

  return { status: 'in_progress' };
}
