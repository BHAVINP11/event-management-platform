"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createGuest_1 = require("../guests/createGuest");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const validInput = {
    eventId: EVENT_ID,
    name: 'Rajesh Patel',
    side: 'bride',
    relation: 'Uncle'
};
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedEventMember(fake, userId, overrides = {}) {
    const eventId = overrides.eventId ?? EVENT_ID;
    fake.seed('eventMembers', `${EVENT_ID}_${userId}`, {
        eventId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner'
    });
}
describe('handleCreateGuest', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can create a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', result.guestId)).toMatchObject({
            eventId: EVENT_ID,
            name: 'Rajesh Patel',
            side: 'bride',
            relation: 'Uncle',
            status: 'pending',
            createdBy: 'user1'
        });
    });
    test('a planner can create a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', result.guestId)?.status).toBe('pending');
    });
    test('a couple member can view but cannot create a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'couple' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('a family member can view but cannot create a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'family' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('a viewer cannot create a guest', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test.each(['bride', 'groom', 'both'])('accepts side %s', async (side) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createGuest_1.handleCreateGuest)(db, { ...validInput, side }, { auth: { uid: 'user1' } });
        expect(fake.read('guests', result.guestId)?.side).toBe(side);
    });
    test('rejects a missing name', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid side', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, { ...validInput, side: 'best-man' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_side' });
    });
    test('rejects an invalid status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, { ...validInput, status: 'attending' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_status' });
    });
    test('rejects an invalid email', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, { ...validInput, email: 'not-an-email' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_email' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('defaults status to pending when omitted', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('guests', result.guestId)?.status).toBe('pending');
    });
    test('createdBy comes from the authenticated UID, not client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createGuest_1.handleCreateGuest)(db, { ...validInput, createdBy: 'someone-else', id: 'chosen-by-client' }, { auth: { uid: 'user1' } });
        expect(fake.read('guests', result.guestId)?.createdBy).toBe('user1');
    });
    test('an owner of a different event cannot create a guest for this event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        // user1 is a legitimate owner of event2, but has no membership in event1.
        fake.seed('eventMembers', 'event2_user1', {
            eventId: 'event2',
            userId: 'user1',
            status: 'active',
            role: 'owner'
        });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createGuest_1.handleCreateGuest)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
