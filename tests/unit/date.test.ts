import { isBeforeToday } from '@/lib/date';

function isoDateOffsetFromToday(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('isBeforeToday', () => {
  test('a date in the past is before today', () => {
    expect(isBeforeToday(isoDateOffsetFromToday(-1))).toBe(true);
  });

  test('today itself is not before today', () => {
    expect(isBeforeToday(isoDateOffsetFromToday(0))).toBe(false);
  });

  test('a future date is not before today', () => {
    expect(isBeforeToday(isoDateOffsetFromToday(1))).toBe(false);
  });

  test('an unset date is not before today', () => {
    expect(isBeforeToday(undefined)).toBe(false);
  });

  test('an unparseable date is not before today', () => {
    expect(isBeforeToday('not-a-date')).toBe(false);
  });
});
