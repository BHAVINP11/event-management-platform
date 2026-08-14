"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createInvitation_1 = require("../invitations/createInvitation");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const validInput = {
    eventId: EVENT_ID,
    invitedEmail: 'meena@example.com',
    role: 'family'
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
describe('handleCreateInvitation', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createInvitation_1.handleCreateInvitation)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('a non-member cannot invite', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('a couple member cannot invite yet', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'couple' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('an owner can invite', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('invitations', result.invitationId)).toMatchObject({
            eventId: EVENT_ID,
            invitedEmail: 'meena@example.com',
            role: 'family',
            status: 'pending',
            invitedBy: 'user1'
        });
    });
    test('a planner can invite', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('invitations', result.invitationId)?.status).toBe('pending');
    });
    test('rejects an invalid email', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, { ...validInput, invitedEmail: 'not-an-email' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid role', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, { ...validInput, role: 'owner' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_role' });
    });
    test('rejects an invalid side for a role that does not use one', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, { ...validInput, role: 'planner', side: 'bride' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_side' });
    });
    test('rejects a side value that is not bride or groom', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, { ...validInput, role: 'couple', side: 'best-man' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_side' });
    });
    test('accepts a couple invitation with a bride/groom side', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createInvitation_1.handleCreateInvitation)(db, { ...validInput, invitedEmail: 'priya@example.com', role: 'couple', side: 'bride' }, { auth: { uid: 'user1' } });
        expect(fake.read('invitations', result.invitationId)).toMatchObject({ role: 'couple', side: 'bride' });
    });
    test('rejects a duplicate pending invitation for the same event and email', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } });
        await expect((0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'invitation_already_pending'
        });
    });
    test('a missing event is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createInvitation_1.handleCreateInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
});
