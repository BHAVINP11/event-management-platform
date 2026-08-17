import { sortFunctionsChronologically } from '@/features/events/services/functionSorting';
import { buildEventFunction } from './fakes';

describe('sortFunctionsChronologically', () => {
  test('sorts dated functions earliest first', () => {
    const result = sortFunctionsChronologically([
      buildEventFunction({ id: 'a', eventId: 'event1', name: 'Reception', date: '2027-02-16' }),
      buildEventFunction({ id: 'b', eventId: 'event1', name: 'Mehndi', date: '2027-02-12' }),
      buildEventFunction({ id: 'c', eventId: 'event1', name: 'Wedding', date: '2027-02-15' })
    ]);

    expect(result.map((fn) => fn.name)).toEqual(['Mehndi', 'Wedding', 'Reception']);
  });

  test('breaks ties on the same date by start time', () => {
    const result = sortFunctionsChronologically([
      buildEventFunction({ id: 'a', eventId: 'event1', name: 'Evening Slot', date: '2027-02-12', startTime: '18:00' }),
      buildEventFunction({ id: 'b', eventId: 'event1', name: 'Morning Slot', date: '2027-02-12', startTime: '09:00' })
    ]);

    expect(result.map((fn) => fn.name)).toEqual(['Morning Slot', 'Evening Slot']);
  });

  test('places undated functions after every dated function', () => {
    const result = sortFunctionsChronologically([
      buildEventFunction({ id: 'a', eventId: 'event1', name: 'Someday' }),
      buildEventFunction({ id: 'b', eventId: 'event1', name: 'Wedding', date: '2027-02-15' })
    ]);

    expect(result.map((fn) => fn.name)).toEqual(['Wedding', 'Someday']);
  });

  test('sorts undated functions alphabetically among themselves', () => {
    const result = sortFunctionsChronologically([
      buildEventFunction({ id: 'a', eventId: 'event1', name: 'Zebra Ceremony' }),
      buildEventFunction({ id: 'b', eventId: 'event1', name: 'Alpha Ceremony' })
    ]);

    expect(result.map((fn) => fn.name)).toEqual(['Alpha Ceremony', 'Zebra Ceremony']);
  });

  test('does not mutate the input array', () => {
    const input = [
      buildEventFunction({ id: 'a', eventId: 'event1', name: 'B', date: '2027-02-16' }),
      buildEventFunction({ id: 'b', eventId: 'event1', name: 'A', date: '2027-02-12' })
    ];
    const inputCopy = [...input];

    sortFunctionsChronologically(input);

    expect(input).toEqual(inputCopy);
  });
});
