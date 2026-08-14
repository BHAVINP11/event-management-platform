import { handleUpdateFunction } from '../ceremonies/updateFunction';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const FUNCTION_ID = 'function1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedFunction(fake: FakeFirestore, overrides: Record<string, unknown> = {}): void {
  fake.seed('functions', FUNCTION_ID, {
    eventId: EVENT_ID,
    name: 'Mehndi',
    status: 'planned',
    createdBy: 'owner1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
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

const validInput = { functionId: FUNCTION_ID, name: 'Mehndi Ceremony', status: 'confirmed', venue: 'Royal Palace' };

describe('handleUpdateFunction', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleUpdateFunction(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing function is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'function_not_found'
    });
  });

  test("a caller with no membership for the function's event is rejected", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    const db = asFirestore(fake);

    await expect(handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can update a function', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('functions', FUNCTION_ID)).toMatchObject({
      name: 'Mehndi Ceremony',
      status: 'confirmed',
      venue: 'Royal Palace'
    });
  });

  test('a planner can update a function', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('functions', FUNCTION_ID)?.status).toBe('confirmed');
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot update a function', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
    expect(fake.read('functions', FUNCTION_ID)?.name).toBe('Mehndi');
  });

  test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateFunction(
      db,
      { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('functions', FUNCTION_ID)).toMatchObject({
      id: FUNCTION_ID,
      eventId: EVENT_ID,
      createdBy: 'owner1',
      createdAt: '2020-01-01T00:00:00.000Z'
    });
  });

  test('rejects an invalid status', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleUpdateFunction(db, { ...validInput, status: 'happening' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid time range', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedFunction(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleUpdateFunction(
        db,
        { ...validInput, startTime: '18:00', endTime: '17:00' },
        { auth: { uid: 'user1' } }
      )
    ).rejects.toMatchObject({ code: 'invalid_time_range' });
  });

  test("an owner of a different event cannot update this event's function", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedFunction(fake, { eventId: 'event1' });
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleUpdateFunction(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
