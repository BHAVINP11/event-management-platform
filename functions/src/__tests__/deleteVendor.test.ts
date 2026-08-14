import { handleDeleteVendor } from '../vendors/deleteVendor';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const VENDOR_ID = 'vendor1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedVendor(fake: FakeFirestore, overrides: { eventId?: string } = {}): void {
  fake.seed('vendors', VENDOR_ID, {
    eventId: overrides.eventId ?? EVENT_ID,
    name: 'Royal Caterers',
    category: 'catering',
    status: 'enquiry',
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

const deleteInput = { vendorId: VENDOR_ID };

describe('handleDeleteVendor', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleDeleteVendor(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing vendor is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'vendor_not_found'
    });
  });

  test("a caller with no membership for the vendor's event is rejected, and the vendor survives", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedVendor(fake);
    const db = asFirestore(fake);

    await expect(handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('vendors', VENDOR_ID)).toBeDefined();
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedVendor(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can delete a vendor', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedVendor(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ vendorId: VENDOR_ID });
    expect(fake.read('vendors', VENDOR_ID)).toBeUndefined();
  });

  test('a planner can delete a vendor', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedVendor(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } });

    expect(fake.read('vendors', VENDOR_ID)).toBeUndefined();
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot delete a vendor', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedVendor(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
    expect(fake.read('vendors', VENDOR_ID)).toBeDefined();
  });

  test("an owner of a different event cannot delete this event's vendor", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedVendor(fake, { eventId: 'event1' });
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleDeleteVendor(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
    expect(fake.read('vendors', VENDOR_ID)).toBeDefined();
  });
});
