import { getEventCountdown } from '@/features/events/services/eventCountdown';

// Built via the local Date constructor (not a 'Z'-suffixed string) so
// these tests are stable regardless of the machine's timezone — matching
// how the app's own `datetime-local` form fields produce timezone-less
// date strings in the first place.
const NOW = new Date(2026, 7, 13, 12, 0, 0);

function localIso(year: number, month: number, day: number, hour = 0): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`;
}

describe('getEventCountdown', () => {
  test('unscheduled when there is no start date', () => {
    expect(getEventCountdown(undefined, undefined, NOW)).toEqual({ status: 'unscheduled' });
  });

  test('unscheduled when the start date is unparseable', () => {
    expect(getEventCountdown('not-a-date', undefined, NOW)).toEqual({ status: 'unscheduled' });
  });

  test('upcoming with the number of calendar days remaining', () => {
    expect(getEventCountdown(localIso(2026, 8, 19, 18), undefined, NOW)).toEqual({
      status: 'upcoming',
      days: 6
    });
  });

  test('in progress on the start date itself, even with no end date', () => {
    expect(getEventCountdown(localIso(2026, 8, 13, 9), undefined, NOW)).toEqual({ status: 'in_progress' });
  });

  test('completed the day after a single-day (no end date) event', () => {
    expect(getEventCountdown(localIso(2026, 8, 12), undefined, NOW)).toEqual({ status: 'completed' });
  });

  test('in progress while between start and end dates', () => {
    expect(getEventCountdown(localIso(2026, 8, 10), localIso(2026, 8, 20), NOW)).toEqual({ status: 'in_progress' });
  });

  test('completed once the end date has passed', () => {
    expect(getEventCountdown(localIso(2026, 7, 1), localIso(2026, 8, 1), NOW)).toEqual({ status: 'completed' });
  });

  test('treats an end date before the start date as a single-day event rather than crashing', () => {
    expect(getEventCountdown(localIso(2026, 8, 13, 6), localIso(2026, 8, 10), NOW)).toEqual({
      status: 'in_progress'
    });
  });

  test('does not mutate or depend on argument order between start and end', () => {
    const upcoming = getEventCountdown(localIso(2026, 8, 20), localIso(2026, 8, 25), NOW);
    expect(upcoming).toEqual({ status: 'upcoming', days: 7 });
  });
});
