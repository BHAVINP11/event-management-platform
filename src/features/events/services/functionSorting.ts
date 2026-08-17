import { EventFunction } from '@/types/eventFunction';
import { parseIsoDate } from '@/lib/date';

/**
 * Chronological ordering for a single event's functions/ceremonies, done
 * entirely client-side over the already-loaded list — no new query.
 *
 * Dated functions sort earliest first (by date, then by start time when
 * two share a date); undated functions sort after all dated ones,
 * alphabetically among themselves. Unlike the dashboard's event ordering
 * (`eventSorting.ts`), there is no "past vs. upcoming" split here — every
 * ceremony in an event's own list stays relevant regardless of "now".
 */
export function sortFunctionsChronologically(functions: readonly EventFunction[]): EventFunction[] {
  return [...functions].sort((a, b) => {
    const dateA = parseIsoDate(a.date);
    const dateB = parseIsoDate(b.date);

    if (!dateA && !dateB) {
      return a.name.localeCompare(b.name);
    }
    if (!dateA) {
      return 1;
    }
    if (!dateB) {
      return -1;
    }

    const dayDiff = dateA.getTime() - dateB.getTime();
    if (dayDiff !== 0) {
      return dayDiff;
    }

    const timeA = a.startTime ?? '';
    const timeB = b.startTime ?? '';
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }

    return a.name.localeCompare(b.name);
  });
}
