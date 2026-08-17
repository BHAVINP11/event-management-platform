import { computeAttentionItems, computeNextUpFunction, computeSnapshotStats } from '@/features/events/services/eventCommandCenter';
import { EventFunctionStatus } from '@/types/eventFunction';
import { TaskStatus } from '@/types/task';
import { PaymentStatus } from '@/types/expense';
import { VendorStatus } from '@/types/vendor';
import { buildEventFunction, buildExpense, buildGuest, buildTask, buildVendor } from './fakes';

// Local-constructed (no 'Z' suffix) so these are stable regardless of the
// machine's timezone, matching the convention in eventCountdown.test.ts.
const NOW = new Date(2026, 7, 13, 12, 0, 0);
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

describe('computeNextUpFunction', () => {
  test('picks the soonest function that has not already passed', () => {
    const result = computeNextUpFunction(
      [
        buildEventFunction({ id: 'a', eventId: 'e1', name: 'Reception', date: iso(2026, 8, 20) }),
        buildEventFunction({ id: 'b', eventId: 'e1', name: 'Mehndi', date: iso(2026, 8, 14) }),
        buildEventFunction({ id: 'c', eventId: 'e1', name: 'Sangeet', date: iso(2026, 8, 1) })
      ],
      NOW
    );

    expect(result?.name).toBe('Mehndi');
  });

  test('includes a function happening today', () => {
    const result = computeNextUpFunction(
      [buildEventFunction({ id: 'a', eventId: 'e1', name: 'Haldi', date: iso(2026, 8, 13) })],
      NOW
    );

    expect(result?.name).toBe('Haldi');
  });

  test('excludes cancelled functions', () => {
    const result = computeNextUpFunction(
      [
        buildEventFunction({
          id: 'a',
          eventId: 'e1',
          name: 'Cancelled Thing',
          date: iso(2026, 8, 14),
          status: EventFunctionStatus.Cancelled
        })
      ],
      NOW
    );

    expect(result).toBeNull();
  });

  test('returns null when there are no upcoming functions', () => {
    expect(computeNextUpFunction([], NOW)).toBeNull();
  });

  test('ignores functions with no date', () => {
    expect(computeNextUpFunction([buildEventFunction({ id: 'a', eventId: 'e1', name: 'Someday' })], NOW)).toBeNull();
  });
});

describe('computeAttentionItems', () => {
  test('counts tasks due within the attention window or overdue, excluding completed/cancelled', () => {
    const items = computeAttentionItems(
      [
        buildTask({ id: 'a', eventId: 'e1', dueDate: iso(2026, 8, 14) }),
        buildTask({ id: 'b', eventId: 'e1', dueDate: iso(2026, 8, 10) }),
        buildTask({ id: 'c', eventId: 'e1', dueDate: iso(2026, 8, 14), status: TaskStatus.Completed }),
        buildTask({ id: 'd', eventId: 'e1', dueDate: iso(2026, 9, 30) })
      ],
      [],
      [],
      NOW
    );

    expect(items).toContainEqual({ key: 'tasks', label: '2 tasks due soon' });
  });

  test('counts unpaid and partially paid expenses as pending', () => {
    const items = computeAttentionItems(
      [],
      [
        buildExpense({ id: 'a', eventId: 'e1', paymentStatus: PaymentStatus.Unpaid }),
        buildExpense({ id: 'b', eventId: 'e1', paymentStatus: PaymentStatus.PartiallyPaid }),
        buildExpense({ id: 'c', eventId: 'e1', paymentStatus: PaymentStatus.Paid })
      ],
      [],
      NOW
    );

    expect(items).toContainEqual({ key: 'expenses', label: '2 expenses pending' });
  });

  test('counts enquiry/shortlisted vendors as awaiting confirmation', () => {
    const items = computeAttentionItems(
      [],
      [],
      [
        buildVendor({ id: 'a', eventId: 'e1', status: VendorStatus.Enquiry }),
        buildVendor({ id: 'b', eventId: 'e1', status: VendorStatus.Confirmed })
      ],
      NOW
    );

    expect(items).toContainEqual({ key: 'vendors', label: '1 vendor awaiting confirmation' });
  });

  test('returns an empty array when nothing needs attention', () => {
    expect(
      computeAttentionItems(
        [buildTask({ id: 'a', eventId: 'e1', status: TaskStatus.Completed })],
        [buildExpense({ id: 'b', eventId: 'e1', paymentStatus: PaymentStatus.Paid })],
        [buildVendor({ id: 'c', eventId: 'e1', status: VendorStatus.Confirmed })],
        NOW
      )
    ).toEqual([]);
  });
});

describe('computeSnapshotStats', () => {
  test('reports plain counts and the planned total, matching the loaded lists', () => {
    const stats = computeSnapshotStats(
      [buildGuest({ id: 'g1', eventId: 'e1' }), buildGuest({ id: 'g2', eventId: 'e1' })],
      [buildEventFunction({ id: 'f1', eventId: 'e1' })],
      [
        buildExpense({ id: 'x1', eventId: 'e1', amount: 500000 }),
        buildExpense({ id: 'x2', eventId: 'e1', amount: 124000 })
      ],
      [buildVendor({ id: 'v1', eventId: 'e1' })],
      undefined
    );

    expect(stats).toEqual([
      { key: 'guests', label: 'Guests', value: '2' },
      { key: 'functions', label: 'Function', value: '1' },
      { key: 'planned', label: 'Planned', value: expect.stringContaining('6,24,000') },
      { key: 'expenses', label: 'Expenses', value: '2' },
      { key: 'vendors', label: 'Vendor', value: '1' }
    ]);
  });
});
