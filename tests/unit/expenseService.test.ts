import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { ExpenseService } from '@/features/events/services/expenseService';
import { ExpenseError, EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
import { ExpenseCategory, PaymentStatus } from '@/types/expense';
import {
  buildEvent,
  buildEventMember,
  buildExpense,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeExpenseRepository,
  FakeOrganizationMemberRepository
} from './fakes';

const mockCallable = jest.fn();

jest.mock('@/services/firebase/functions', () => ({ functions: {} }));
jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (input: unknown) => mockCallable(name, input)
}));

interface WorldOptions {
  events?: ReturnType<typeof buildEvent>[];
  eventMembers?: ReturnType<typeof buildEventMember>[];
  expenses?: ReturnType<typeof buildExpense>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);
  const expenseRepository = new FakeExpenseRepository(options.expenses ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository([]),
    eventMemberRepository
  );

  return {
    expenseRepository,
    service: new ExpenseService(authorizationService, eventRepository, expenseRepository)
  };
};

describe('ExpenseService.listExpenses', () => {
  beforeEach(() => mockCallable.mockReset());

  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({ events: [buildEvent({ id: 'event1' })] });

    await expect(service.listExpenses('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the event document is missing', async () => {
    const { service } = buildWorld({ eventMembers: [buildEventMember('event1', 'user1')] });

    await expect(service.listExpenses('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an inactive membership is denied', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { status: MembershipStatus.Inactive })]
    });

    await expect(service.listExpenses('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('lists every expense for the event, regardless of role', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Viewer })],
      expenses: [
        buildExpense({ id: 'e1', eventId: 'event1', title: 'Venue Booking' }),
        buildExpense({ id: 'e2', eventId: 'event1', title: 'Catering' }),
        buildExpense({ id: 'e3', eventId: 'event2', title: "Someone Else's Expense" })
      ]
    });

    const result = await service.listExpenses('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.expenses.map((e) => e.title).sort()).toEqual(['Catering', 'Venue Booking']);
  });

  test.each([EventRole.Owner, EventRole.Planner])('offers canManage to %s', async (role) => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role })]
    });

    const result = await service.listExpenses('user1', 'event1');

    expect(result.status === 'allowed' && result.data.canManage).toBe(true);
  });

  test.each([EventRole.Couple, EventRole.Family, EventRole.Staff, EventRole.Viewer])(
    'does not offer canManage to %s',
    async (role) => {
      const { service } = buildWorld({
        events: [buildEvent({ id: 'event1' })],
        eventMembers: [buildEventMember('event1', 'user1', { role })]
      });

      const result = await service.listExpenses('user1', 'event1');

      expect(result.status === 'allowed' && result.data.canManage).toBe(false);
    }
  );

  // Budget = 1,000; Expense A = 400 paid; Expense B = 300 partially paid, paidAmount = 100.
  // Expected: Total Planned = 700, Total Paid = 500, Remaining = 300, Remaining After Payments = 500.
  test('calculates totals correctly from the spec worked example', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1', budgetAmount: 1000 })],
      eventMembers: [buildEventMember('event1', 'user1')],
      expenses: [
        buildExpense({
          id: 'a',
          eventId: 'event1',
          amount: 400,
          paymentStatus: PaymentStatus.Paid,
          paidAmount: 400
        }),
        buildExpense({
          id: 'b',
          eventId: 'event1',
          amount: 300,
          paymentStatus: PaymentStatus.PartiallyPaid,
          paidAmount: 100
        })
      ]
    });

    const result = await service.listExpenses('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.totals).toEqual({
      planned: 700,
      paid: 500,
      remaining: 300,
      remainingAfterPayments: 500
    });
  });

  test('remaining and remainingAfterPayments are null when no budget is set', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')],
      expenses: [buildExpense({ id: 'a', eventId: 'event1', amount: 400 })]
    });

    const result = await service.listExpenses('user1', 'event1');

    expect(result.status === 'allowed' && result.data.totals.remaining).toBeNull();
    expect(result.status === 'allowed' && result.data.totals.remainingAfterPayments).toBeNull();
    expect(result.status === 'allowed' && result.data.budgetAmount).toBeUndefined();
  });

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.expenseRepository.failing = true;

    await expect(world.service.listExpenses('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });
});

describe('ExpenseService.createExpense', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the createExpense callable with the eventId included', async () => {
    mockCallable.mockResolvedValue({ data: { expenseId: 'expense1' } });
    const { service } = buildWorld();

    const expenseId = await service.createExpense('event1', {
      title: 'Venue Booking',
      category: ExpenseCategory.Venue,
      amount: 200000,
      paymentStatus: PaymentStatus.Unpaid
    });

    expect(expenseId).toBe('expense1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateExpense', {
      eventId: 'event1',
      title: 'Venue Booking',
      category: ExpenseCategory.Venue,
      amount: 200000,
      paymentStatus: PaymentStatus.Unpaid
    });
  });

  test('converts a role-not-allowed failure into a friendly ExpenseError', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(
      service.createExpense('event1', {
        title: 'Venue Booking',
        category: ExpenseCategory.Venue,
        amount: 1,
        paymentStatus: PaymentStatus.Unpaid
      })
    ).rejects.toMatchObject({
      code: 'event_role_not_allowed',
      friendlyMessage: "Your role doesn't allow managing expenses for this event."
    });
  });

  test('converts an invalid paid amount failure into a friendly ExpenseError', async () => {
    mockCallable.mockRejectedValue({
      code: 'invalid-argument',
      message: 'bad amount',
      details: { appCode: 'invalid_paid_amount' }
    });
    const { service } = buildWorld();

    await expect(
      service.createExpense('event1', {
        title: 'Venue Booking',
        category: ExpenseCategory.Venue,
        amount: 1,
        paymentStatus: PaymentStatus.PartiallyPaid,
        paidAmount: 999
      })
    ).rejects.toMatchObject({ friendlyMessage: 'Paid amount must be between 0 and the expense amount.' });
  });

  test('falls back to a generic message for an unrecognized app code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const { service } = buildWorld();

    const error = await service
      .createExpense('event1', {
        title: 'Venue Booking',
        category: ExpenseCategory.Venue,
        amount: 1,
        paymentStatus: PaymentStatus.Unpaid
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExpenseError);
    expect(error.friendlyMessage).toBe('Something went wrong. Please try again.');
  });
});

describe('ExpenseService.updateExpense', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the updateExpense callable with the expenseId included', async () => {
    mockCallable.mockResolvedValue({ data: { expenseId: 'expense1' } });
    const { service } = buildWorld();

    await service.updateExpense('expense1', {
      title: 'Venue Booking (Paid)',
      category: ExpenseCategory.Venue,
      amount: 200000,
      paymentStatus: PaymentStatus.Paid
    });

    expect(mockCallable).toHaveBeenCalledWith('onUpdateExpense', {
      expenseId: 'expense1',
      title: 'Venue Booking (Paid)',
      category: ExpenseCategory.Venue,
      amount: 200000,
      paymentStatus: PaymentStatus.Paid
    });
  });

  test('surfaces a not-found expense as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'not-found',
      message: 'missing',
      details: { appCode: 'expense_not_found' }
    });
    const { service } = buildWorld();

    await expect(
      service.updateExpense('expense1', {
        title: 'x',
        category: ExpenseCategory.Other,
        amount: 1,
        paymentStatus: PaymentStatus.Unpaid
      })
    ).rejects.toMatchObject({ friendlyMessage: "We couldn't find this expense." });
  });
});

describe('ExpenseService.deleteExpense', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the deleteExpense callable', async () => {
    mockCallable.mockResolvedValue({ data: { expenseId: 'expense1' } });
    const { service } = buildWorld();

    await service.deleteExpense('expense1');

    expect(mockCallable).toHaveBeenCalledWith('onDeleteExpense', { expenseId: 'expense1' });
  });

  test('surfaces an access-denied failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'denied',
      details: { appCode: 'event_access_denied' }
    });
    const { service } = buildWorld();

    await expect(service.deleteExpense('expense1')).rejects.toMatchObject({
      friendlyMessage: "You don't have access to this event."
    });
  });
});

describe('ExpenseService.updateBudget', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the updateEventBudget callable', async () => {
    mockCallable.mockResolvedValue({ data: { eventId: 'event1', budgetAmount: 1000000 } });
    const { service } = buildWorld();

    await service.updateBudget('event1', 1000000);

    expect(mockCallable).toHaveBeenCalledWith('onUpdateEventBudget', { eventId: 'event1', budgetAmount: 1000000 });
  });

  test('surfaces an invalid budget amount as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'invalid-argument',
      message: 'negative',
      details: { appCode: 'invalid_budget_amount' }
    });
    const { service } = buildWorld();

    await expect(service.updateBudget('event1', -1)).rejects.toMatchObject({
      friendlyMessage: 'Budget amount must be zero or greater.'
    });
  });

  test('surfaces a role-not-allowed failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(service.updateBudget('event1', 1000)).rejects.toMatchObject({
      friendlyMessage: "Your role doesn't allow managing expenses for this event."
    });
  });
});
