import { sortTasksByDueDate } from '@/features/events/services/taskSorting';
import { buildTask } from './fakes';

describe('sortTasksByDueDate', () => {
  test('sorts dated tasks earliest due date first', () => {
    const result = sortTasksByDueDate([
      buildTask({ id: 'a', eventId: 'event1', title: 'Send invitations', dueDate: '2027-02-16' }),
      buildTask({ id: 'b', eventId: 'event1', title: 'Book venue', dueDate: '2027-01-10' }),
      buildTask({ id: 'c', eventId: 'event1', title: 'Order flowers', dueDate: '2027-02-01' })
    ]);

    expect(result.map((task) => task.title)).toEqual(['Book venue', 'Order flowers', 'Send invitations']);
  });

  test('places undated tasks after every dated task', () => {
    const result = sortTasksByDueDate([
      buildTask({ id: 'a', eventId: 'event1', title: 'Someday task' }),
      buildTask({ id: 'b', eventId: 'event1', title: 'Book venue', dueDate: '2027-01-10' })
    ]);

    expect(result.map((task) => task.title)).toEqual(['Book venue', 'Someday task']);
  });

  test('sorts undated tasks alphabetically among themselves', () => {
    const result = sortTasksByDueDate([
      buildTask({ id: 'a', eventId: 'event1', title: 'Zebra task' }),
      buildTask({ id: 'b', eventId: 'event1', title: 'Alpha task' })
    ]);

    expect(result.map((task) => task.title)).toEqual(['Alpha task', 'Zebra task']);
  });

  test('does not mutate the input array', () => {
    const input = [
      buildTask({ id: 'a', eventId: 'event1', dueDate: '2027-02-16' }),
      buildTask({ id: 'b', eventId: 'event1', dueDate: '2027-01-10' })
    ];
    const inputCopy = [...input];

    sortTasksByDueDate(input);

    expect(input).toEqual(inputCopy);
  });
});
