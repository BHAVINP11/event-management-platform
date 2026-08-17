"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const removeMember_1 = require("../members/removeMember");
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
const validInput = { eventId: EVENT_ID, userId: 'target-user' };
describe('handleRemoveMember', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s caller cannot remove a member', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role });
        seedEventMember(fake, 'target-user', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('an owner can remove a planner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        seedEventMember(fake, 'target-user', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } });
        expect(result).toEqual({ eventId: EVENT_ID, userId: 'target-user' });
        expect(fake.read('eventMembers', `${EVENT_ID}_target-user`)).toMatchObject({ status: 'revoked' });
    });
    test('a planner can remove a couple member', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'planner' });
        seedEventMember(fake, 'target-user', { role: 'couple', side: 'bride' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } });
        expect(fake.read('eventMembers', `${EVENT_ID}_target-user`)).toMatchObject({ status: 'revoked' });
    });
    test('cannot remove the event owner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'planner' });
        seedEventMember(fake, 'target-user', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_owner_cannot_be_removed'
        });
        expect(fake.read('eventMembers', `${EVENT_ID}_target-user`)).toMatchObject({ status: 'active' });
    });
    test('a missing target member is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'member_not_found'
        });
    });
    test('does not affect an unrelated member', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'caller', { role: 'owner' });
        seedEventMember(fake, 'target-user', { role: 'staff' });
        seedEventMember(fake, 'other-user', { role: 'viewer' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } });
        expect(fake.read('eventMembers', `${EVENT_ID}_other-user`)).toMatchObject({ status: 'active' });
    });
    test('an owner of a different event cannot remove this event\'s member', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'caller', { eventId: 'event2', role: 'owner' });
        seedEventMember(fake, 'target-user', { eventId: 'event1', role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
