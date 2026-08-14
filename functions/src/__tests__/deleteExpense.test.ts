import { handleDeleteExpense } from '../expenses/deleteExpense';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const EXPENSE_ID = 'expense1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedExpense(fake: FakeFirestore, overrides: { eventId?: string } = {}): void {
  fake.seed('expenses', EXPENSE_ID, {
    eventId: overrides.eventId ?? EVENT_ID,
    title: 'Venue Booking',
    category: 'venue',
    amount: 200000,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    createdBy: 'owner1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  });
}

function seedEventMember(
  fake: FakeFirestore,
  eventId: string,
  userId: string,
  overrides: { status?: string; role?: string; side?: string } = {}
): void {
  fake.seed('eventMembers', `${eventId}_${userId}`, {
    eventId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner',
    ...(overrides.side ? { side: overrides.side } : {})
  });
}

const deleteInput = { expenseId: EXPENSE_ID };

describe('handleDeleteExpense', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleDeleteExpense(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing expense is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'expense_not_found'
    });
  });

  test("a caller with no membership for the expense's event is rejected, and the expense survives", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedExpense(fake);
    const db = asFirestore(fake);

    await expect(handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('expenses', EXPENSE_ID)).toBeDefined();
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedExpense(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can delete an expense', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedExpense(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ expenseId: EXPENSE_ID });
    expect(fake.read('expenses', EXPENSE_ID)).toBeUndefined();
  });

  test('a planner can delete an expense', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedExpense(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } });

    expect(fake.read('expenses', EXPENSE_ID)).toBeUndefined();
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot delete an expense', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedExpense(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
    expect(fake.read('expenses', EXPENSE_ID)).toBeDefined();
  });

  test("an owner of a different event cannot delete this event's expense", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedExpense(fake, { eventId: 'event1' });
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleDeleteExpense(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('expenses', EXPENSE_ID)).toBeDefined();
  });
});
