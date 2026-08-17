"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateMemberRole_1 = require("../members/updateMemberRole");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, {
        id: eventId,
        name: 'Bhavin & Priya Wedding',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    });
}
function seedEventMember(fake, userId, overrides = {}) {
    const eventId = overrides.eventId ?? EVENT_ID;
    fake.seed('eventMembers', `${eventId}_${userId}`, {
        eventId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner',
        ...(overrides.side ? { side: overrides.side } : {})
    });
}
const validInput = { eventId: EVENT_ID, userId: 'target-user', role: 'staff' };
describe('handleUpdateMemberRole', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s caller cannot change a member role', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role });
        seedEventMember(fake, 'target-user', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('an owner can change a member to planner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        seedEventMember(fake, 'target-user', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, updateMemberRole_1.handleUpdateMemberRole)(db, { eventId: EVENT_ID, userId: 'target-user', role: 'planner' }, { auth: { uid: 'caller' } });
        expect(result).toEqual({ eventId: EVENT_ID, userId: 'target-user', role: 'planner', side: null });
        expect(fake.read('eventMembers', `${EVENT_ID}_target-user`)).toMatchObject({ role: 'planner', side: null });
    });
    test('a planner can change a member to couple with a side', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'planner' });
        seedEventMember(fake, 'target-user', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, updateMemberRole_1.handleUpdateMemberRole)(db, { eventId: EVENT_ID, userId: 'target-user', role: 'couple', side: 'bride' }, { auth: { uid: 'caller' } });
        expect(result).toEqual({ eventId: EVENT_ID, userId: 'target-user', role: 'couple', side: 'bride' });
    });
    test('rejects an attempt to promote a member to owner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        seedEventMember(fake, 'target-user', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, { eventId: EVENT_ID, userId: 'target-user', role: 'owner' }, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'invalid_role' });
    });
    test('rejects a side on a role that does not allow one', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        seedEventMember(fake, 'target-user', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, { eventId: EVENT_ID, userId: 'target-user', role: 'staff', side: 'bride' }, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'invalid_side' });
    });
    test("cannot change the event owner's role", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'planner' });
        seedEventMember(fake, 'target-user', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_owner_role_immutable'
        });
        expect(fake.read('eventMembers', `${EVENT_ID}_target-user`)).toMatchObject({ role: 'owner' });
    });
    test('a missing target member is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'member_not_found'
        });
    });
    test('clears an existing side when changing to a role that does not allow one', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        seedEventMember(fake, 'target-user', { role: 'couple', side: 'groom' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateMemberRole_1.handleUpdateMemberRole)(db, { eventId: EVENT_ID, userId: 'target-user', role: 'staff' }, { auth: { uid: 'caller' } });
        expect(fake.read('eventMembers', `${EVENT_ID}_target-user`)).toMatchObject({ role: 'staff', side: null });
    });
    test('an owner of a different event cannot change this event\'s member role', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'caller', { eventId: 'event2', role: 'owner' });
        seedEventMember(fake, 'target-user', { eventId: 'event1', role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
