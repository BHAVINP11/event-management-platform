import { handleDeleteGuest } from '../guests/deleteGuest';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const GUEST_ID = 'guest1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedGuest(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('guests', GUEST_ID, {
    eventId,
    name: 'Rajesh Patel',
    side: 'bride',
    status: 'pending',
    createdBy: 'owner1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  });
}

function seedEventMember(
  fake: FakeFirestore,
  eventId: string,
  userId: string,
  overrides: { status?: string; role?: string } = {}
): void {
  fake.seed('eventMembers', `${eventId}_${userId}`, {
    eventId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner'
  });
}

const deleteInput = { guestId: GUEST_ID };

describe('handleDeleteGuest', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleDeleteGuest(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing guest is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'guest_not_found'
    });
  });

  test("a caller with no membership for the guest's event is rejected, and the guest survives", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    const db = asFirestore(fake);

    await expect(handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('guests', GUEST_ID)).toBeDefined();
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can delete a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ guestId: GUEST_ID });
    expect(fake.read('guests', GUEST_ID)).toBeUndefined();
  });

  test('a planner can delete a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)).toBeUndefined();
  });

  test('a couple member can view but cannot delete a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple' });
    const db = asFirestore(fake);

    await expect(handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
    expect(fake.read('guests', GUEST_ID)).toBeDefined();
  });

  test('a family member can view but cannot delete a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'family' });
    const db = asFirestore(fake);

    await expect(handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
    expect(fake.read('guests', GUEST_ID)).toBeDefined();
  });

  test("an owner of a different event cannot delete this event's guest", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedGuest(fake, 'event1');
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleDeleteGuest(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('guests', GUEST_ID)).toBeDefined();
  });
});
