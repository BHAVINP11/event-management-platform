import { handleUpdateGuest } from '../guests/updateGuest';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const GUEST_ID = 'guest1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedGuest(fake: FakeFirestore, overrides: Record<string, unknown> = {}): void {
  fake.seed('guests', GUEST_ID, {
    eventId: EVENT_ID,
    name: 'Rajesh Patel',
    side: 'bride',
    status: 'pending',
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

const validInput = { guestId: GUEST_ID, name: 'Rajesh R. Patel', side: 'bride', status: 'confirmed' };

describe('handleUpdateGuest', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleUpdateGuest(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing guest is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'guest_not_found'
    });
  });

  test("a caller with no membership for the guest's event is rejected", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can update a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)).toMatchObject({ name: 'Rajesh R. Patel', status: 'confirmed' });
  });

  test('a planner can update a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.status).toBe('confirmed');
  });

  test.each([
    ['bride', 'groom'],
    ['groom', 'bride'],
    ['bride', 'both']
  ])('an owner can change a %s guest to %s', async (existingSide, newSide) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: existingSide });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, { ...validInput, side: newSide }, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.side).toBe(newSide);
  });

  test('a bride member can update a bride guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'bride' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, { ...validInput, side: 'bride' }, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.name).toBe('Rajesh R. Patel');
  });

  test('a bride member can update a both guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'both' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, { ...validInput, side: 'both' }, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.status).toBe('confirmed');
  });

  test('a bride member cannot update a groom guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'groom' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateGuest(db, { ...validInput, side: 'groom' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'guest_side_not_allowed' });
  });

  test('a bride member can change a bride guest to both', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'bride' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, { ...validInput, side: 'both' }, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.side).toBe('both');
  });

  test('a bride member cannot change a bride guest to groom', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'bride' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateGuest(db, { ...validInput, side: 'groom' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'guest_side_not_allowed' });
    expect(fake.read('guests', GUEST_ID)?.side).toBe('bride');
  });

  test('a groom member can update a groom guest and change it to both', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'groom' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'groom' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, { ...validInput, side: 'both' }, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.side).toBe('both');
  });

  test('a groom member can update a both guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'both' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'groom' });
    const db = asFirestore(fake);

    await handleUpdateGuest(db, { ...validInput, side: 'both' }, { auth: { uid: 'user1' } });

    expect(fake.read('guests', GUEST_ID)?.status).toBe('confirmed');
  });

  test('a groom member cannot update a bride guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'bride' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'groom' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateGuest(db, { ...validInput, side: 'bride' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'guest_side_not_allowed' });
  });

  test('a groom member cannot change a groom guest to bride', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { side: 'groom' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'groom' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateGuest(db, { ...validInput, side: 'bride' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'guest_side_not_allowed' });
    expect(fake.read('guests', GUEST_ID)?.side).toBe('groom');
  });

  test('a family member cannot update a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'family' });
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('a staff member cannot update a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'staff' });
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('a viewer cannot update a guest', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'viewer' });
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateGuest(
      db,
      { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('guests', GUEST_ID)).toMatchObject({
      id: GUEST_ID,
      eventId: EVENT_ID,
      createdBy: 'owner1',
      createdAt: '2020-01-01T00:00:00.000Z'
    });
  });

  test('rejects an invalid side', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedGuest(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleUpdateGuest(db, { ...validInput, side: 'best-man' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an owner of a different event cannot update this event's guest", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedGuest(fake, { eventId: 'event1' });
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test("a bride of a different event cannot update this event's bride guest", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedGuest(fake, { eventId: 'event1', side: 'bride' });
    seedEventMember(fake, 'event2', 'user1', { role: 'couple', side: 'bride' });
    const db = asFirestore(fake);

    await expect(handleUpdateGuest(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
