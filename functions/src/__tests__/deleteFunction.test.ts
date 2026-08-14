import { handleDeleteFunction } from '../ceremonies/deleteFunction';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const FUNCTION_ID = 'function1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedFunction(fake: FakeFirestore, overrides: { eventId?: string } = {}): void {
  fake.seed('functions', FUNCTION_ID, {
    eventId: overrides.eventId ?? EVENT_ID,
    name: 'Mehndi',
    status: 'planned',
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

const deleteInput = { functionId: FUNCTION_ID };

describe('handleDeleteFunction', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleDeleteFunction(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing function is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'function_not_found'
    });
  });

  test("a caller with no membership for the function's event is rejected, and the function survives", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    const db = asFirestore(fake);

    await expect(handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('functions', FUNCTION_ID)).toBeDefined();
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can delete a function', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ functionId: FUNCTION_ID });
    expect(fake.read('functions', FUNCTION_ID)).toBeUndefined();
  });

  test('a planner can delete a function', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } });

    expect(fake.read('functions', FUNCTION_ID)).toBeUndefined();
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot delete a function', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
    expect(fake.read('functions', FUNCTION_ID)).toBeDefined();
  });

  test("an owner of a different event cannot delete this event's function", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedFunction(fake, { eventId: 'event1' });
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleDeleteFunction(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('functions', FUNCTION_ID)).toBeDefined();
  });
});
