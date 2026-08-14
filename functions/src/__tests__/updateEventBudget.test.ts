import { handleUpdateEventBudget } from '../events/updateEventBudget';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID, overrides: Record<string, unknown> = {}): void {
  fake.seed('events', eventId, {
    id: eventId,
    name: 'Bhavin & Priya Wedding',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  });
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

const validInput = { eventId: EVENT_ID, budgetAmount: 1000000 };

describe('handleUpdateEventBudget', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleUpdateEventBudget(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing event is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_not_found'
    });
  });

  test('a caller with no membership for the event is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    const db = asFirestore(fake);

    await expect(handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { status: 'revoked' });
    const db = asFirestore(fake);

    await expect(handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can set the budget', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ eventId: EVENT_ID, budgetAmount: 1000000 });
    expect(fake.read('events', EVENT_ID)?.budgetAmount).toBe(1000000);
  });

  test('a planner can set the budget', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('events', EVENT_ID)?.budgetAmount).toBe(1000000);
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot set the budget', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('accepts a zero budget', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateEventBudget(db, { eventId: EVENT_ID, budgetAmount: 0 }, { auth: { uid: 'user1' } });

    expect(fake.read('events', EVENT_ID)?.budgetAmount).toBe(0);
  });

  test('rejects a negative budget', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateEventBudget(db, { eventId: EVENT_ID, budgetAmount: -1 }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_budget_amount' });
  });

  test('rejects a non-numeric budget', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateEventBudget(db, { eventId: EVENT_ID, budgetAmount: 'a lot' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('does not modify other event fields', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, EVENT_ID, { name: 'Bhavin & Priya Wedding', type: 'wedding' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('events', EVENT_ID)).toMatchObject({ name: 'Bhavin & Priya Wedding', type: 'wedding' });
  });

  test('an owner of a different event cannot set this event\'s budget', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleUpdateEventBudget(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
