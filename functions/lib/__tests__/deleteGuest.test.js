"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteGuest_1 = require("../guests/deleteGuest");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const GUEST_ID = 'guest1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedGuest(fake, overrides = {}) {
    fake.seed('guests', GUEST_ID, {
        eventId: overrides.eventId ?? EVENT_ID,
        name: 'Rajesh Patel',
        side: overrides.side ?? 'bride',
        status: 'pending',
        createdBy: 'owner1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    });
}
function seedEventMember(fake, eventId, userId, overrides = {}) {
    fake.seed('eventMembers', `${eventId}_${userId}`, {
        eventId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner',
        ...(overrides.side ? { side: overrides.side } : {})
    });
}
const deleteInput = { guestId: GUEST_ID };
describe('handleDeleteGuest', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing guest is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'guest_not_found'
        });
    });
    test("a caller with no membership for the guest's event is rejected, and the guest survives", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can delete a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(result).toEqual({ guestId: GUEST_ID });
        expect(fake.read('guests', GUEST_ID)).toBeUndefined();
    });
    test('a planner can delete a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)).toBeUndefined();
    });
    test.each(['bride', 'groom', 'both'])('an owner can delete a %s guest', async (side) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake, { side });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)).toBeUndefined();
    });
    test.each(['bride', 'both'])('a bride member can delete a %s guest', async (side) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake, { side });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)).toBeUndefined();
    });
    test('a bride member cannot delete a groom guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake, { side: 'groom' });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'bride' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'guest_side_not_allowed'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test.each(['groom', 'both'])('a groom member can delete a %s guest', async (side) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake, { side });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'groom' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)).toBeUndefined();
    });
    test('a groom member cannot delete a bride guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake, { side: 'bride' });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple', side: 'groom' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'guest_side_not_allowed'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test('a family member cannot delete a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'family' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test('a staff member cannot delete a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test('a viewer cannot delete a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test("an owner of a different event cannot delete this event's guest", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedGuest(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
    test("a bride of a different event cannot delete this event's bride guest", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedGuest(fake, { eventId: 'event1', side: 'bride' });
        seedEventMember(fake, 'event2', 'user1', { role: 'couple', side: 'bride' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteGuest_1.handleDeleteGuest)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('guests', GUEST_ID)).toBeDefined();
    });
});
