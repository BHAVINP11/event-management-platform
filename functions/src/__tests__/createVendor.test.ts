import { handleCreateVendor } from '../vendors/createVendor';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';

const validInput = {
  eventId: EVENT_ID,
  name: 'Royal Caterers',
  category: 'catering',
  phone: '9999999999'
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

describe('handleCreateVendor', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateVendor(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing event is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateVendor(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_not_found'
    });
  });

  test('a caller with no membership for the event is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    const db = asFirestore(fake);

    await expect(handleCreateVendor(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { status: 'revoked' });
    const db = asFirestore(fake);

    await expect(handleCreateVendor(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can create a vendor', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCreateVendor(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('vendors', result.vendorId)).toMatchObject({
      eventId: EVENT_ID,
      name: 'Royal Caterers',
      category: 'catering',
      phone: '9999999999',
      status: 'enquiry',
      createdBy: 'user1'
    });
  });

  test('a planner can create a vendor', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    const result = await handleCreateVendor(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('vendors', result.vendorId)?.name).toBe('Royal Caterers');
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot create a vendor', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleCreateVendor(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('rejects a missing name', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateVendor(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid category', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateVendor(db, { ...validInput, category: 'flowers' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_category' });
  });

  test('rejects an invalid status', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateVendor(db, { ...validInput, status: 'booked' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_status' });
  });

  test('rejects an invalid email', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateVendor(db, { ...validInput, email: 'not-an-email' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_email' });
  });

  test('defaults status to enquiry when omitted', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateVendor(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('vendors', result.vendorId)?.status).toBe('enquiry');
  });

  test('createdBy comes from the authenticated UID, not client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateVendor(
      db,
      { ...validInput, createdBy: 'someone-else', id: 'chosen-by-client' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('vendors', result.vendorId)?.createdBy).toBe('user1');
  });

  test('an owner of a different event cannot create a vendor for this event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleCreateVendor(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
