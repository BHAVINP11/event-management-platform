"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateGuest_1 = require("../guests/updateGuest");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const GUEST_ID = 'guest1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedGuest(fake, overrides = {}) {
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
function seedEventMember(fake, eventId, userId, overrides = {}) {
    fake.seed('eventMembers', `${eventId}_${userId}`, {
        eventId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner'
    });
}
const validInput = { guestId: GUEST_ID, name: 'Rajesh R. Patel', side: 'bride', status: 'confirmed' };
describe('handleUpdateGuest', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing guest is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'guest_not_found'
        });
    });
    test("a caller with no membership for the guest's event is rejected", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can update a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)).toMatchObject({ name: 'Rajesh R. Patel', status: 'confirmed' });
    });
    test('a planner can update a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)?.status).toBe('confirmed');
    });
    test('a couple member can view but cannot update a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'couple' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('a family member can view but cannot update a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'family' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateGuest_1.handleUpdateGuest)(db, { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' }, { auth: { uid: 'user1' } });
        expect(fake.read('guests', GUEST_ID)).toMatchObject({
            id: GUEST_ID,
            eventId: EVENT_ID,
            createdBy: 'owner1',
            createdAt: '2020-01-01T00:00:00.000Z'
        });
    });
    test('rejects an invalid side', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedGuest(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, { ...validInput, side: 'best-man' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test("an owner of a different event cannot update this event's guest", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedGuest(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateGuest_1.handleUpdateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
