import { handleCreateExpense } from '../expenses/createExpense';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';

const validInput = {
  eventId: EVENT_ID,
  title: 'Venue Booking',
  category: 'venue',
  amount: 200000
};

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedEventMember(
  fake: FakeFirestore,
  userId: string,
  overrides: { eventId?: string; status?: string; role?: string; side?: string } = {}
): void {
  const eventId = overrides.eventId ?? EVENT_ID;
  fake.seed('eventMembers', `${eventId}_${userId}`, {
    eventId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner',
    ...(overrides.side ? { side: overrides.side } : {})
  });
}

describe('handleCreateExpense', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateExpense(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing event is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateExpense(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_not_found'
    });
  });

  test('a caller with no membership for the event is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    const db = asFirestore(fake);

    await expect(handleCreateExpense(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { status: 'revoked' });
    const db = asFirestore(fake);

    await expect(handleCreateExpense(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can create an expense', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCreateExpense(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('expenses', result.expenseId)).toMatchObject({
      eventId: EVENT_ID,
      title: 'Venue Booking',
      category: 'venue',
      amount: 200000,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      createdBy: 'user1'
    });
  });

  test('a planner can create an expense', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    const result = await handleCreateExpense(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('expenses', result.expenseId)?.title).toBe('Venue Booking');
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot create an expense', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleCreateExpense(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('rejects a missing title', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(db, { ...validInput, title: '' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid category', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(db, { ...validInput, category: 'flowers' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_category' });
  });

  test.each([0, -100])('rejects a non-positive amount (%d)', async (amount) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(db, { ...validInput, amount }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_amount' });
  });

  test('rejects an invalid payment status', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(db, { ...validInput, paymentStatus: 'overdue' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_payment_status' });
  });

  test('rejects an invalid payment date', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(db, { ...validInput, paymentDate: 'not-a-date' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_payment_date' });
  });

  test('defaults paymentStatus to unpaid and paidAmount to 0 when omitted', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateExpense(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('expenses', result.expenseId)).toMatchObject({ paymentStatus: 'unpaid', paidAmount: 0 });
  });

  test('a fully paid expense gets paidAmount equal to amount, regardless of client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateExpense(
      db,
      { ...validInput, paymentStatus: 'paid', paidAmount: 1 },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('expenses', result.expenseId)).toMatchObject({ paymentStatus: 'paid', paidAmount: 200000 });
  });

  test('a partially paid expense requires and validates paidAmount', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateExpense(
      db,
      { ...validInput, paymentStatus: 'partially_paid', paidAmount: 100000 },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('expenses', result.expenseId)).toMatchObject({
      paymentStatus: 'partially_paid',
      paidAmount: 100000
    });
  });

  test('rejects a partially paid expense with no paidAmount', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(db, { ...validInput, paymentStatus: 'partially_paid' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_paid_amount' });
  });

  test('rejects a negative paidAmount for a partially paid expense', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(
        db,
        { ...validInput, paymentStatus: 'partially_paid', paidAmount: -1 },
        { auth: { uid: 'user1' } }
      )
    ).rejects.toMatchObject({ code: 'invalid_paid_amount' });
  });

  test('rejects a paidAmount greater than the expense amount', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateExpense(
        db,
        { ...validInput, paymentStatus: 'partially_paid', paidAmount: 300000 },
        { auth: { uid: 'user1' } }
      )
    ).rejects.toMatchObject({ code: 'invalid_paid_amount' });
  });

  test('an unpaid expense forces paidAmount to 0, regardless of client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateExpense(
      db,
      { ...validInput, paymentStatus: 'unpaid', paidAmount: 999999 },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('expenses', result.expenseId)?.paidAmount).toBe(0);
  });

  test('createdBy comes from the authenticated UID, not client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateExpense(
      db,
      { ...validInput, createdBy: 'someone-else', id: 'chosen-by-client' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('expenses', result.expenseId)?.createdBy).toBe('user1');
  });

  test('an owner of a different event cannot create an expense for this event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleCreateExpense(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
