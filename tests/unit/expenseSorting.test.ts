import { sortExpensesByRecency } from '@/features/events/services/expenseSorting';
import { buildExpense } from './fakes';

describe('sortExpensesByRecency', () => {
  test('sorts most recently created expense first', () => {
    const result = sortExpensesByRecency([
      buildExpense({ id: 'a', eventId: 'event1', title: 'Venue', createdAt: '2027-01-01T00:00:00.000Z' }),
      buildExpense({ id: 'b', eventId: 'event1', title: 'Catering', createdAt: '2027-02-01T00:00:00.000Z' }),
      buildExpense({ id: 'c', eventId: 'event1', title: 'Photography', createdAt: '2027-01-15T00:00:00.000Z' })
    ]);

    expect(result.map((expense) => expense.title)).toEqual(['Catering', 'Photography', 'Venue']);
  });

  test('does not mutate the input array', () => {
    const input = [
      buildExpense({ id: 'a', eventId: 'event1', createdAt: '2027-01-01T00:00:00.000Z' }),
      buildExpense({ id: 'b', eventId: 'event1', createdAt: '2027-02-01T00:00:00.000Z' })
    ];
    const inputCopy = [...input];

    sortExpensesByRecency(input);

    expect(input).toEqual(inputCopy);
  });
});
