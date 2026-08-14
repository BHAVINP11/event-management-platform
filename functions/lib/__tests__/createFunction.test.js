"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createFunction_1 = require("../ceremonies/createFunction");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const validInput = {
    eventId: EVENT_ID,
    name: 'Mehndi',
    venue: 'Royal Palace',
    date: '2027-02-12'
};
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
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
describe('handleCreateFunction', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createFunction_1.handleCreateFunction)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can create a function', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('functions', result.functionId)).toMatchObject({
            eventId: EVENT_ID,
            name: 'Mehndi',
            venue: 'Royal Palace',
            date: '2027-02-12',
            status: 'planned',
            createdBy: 'user1'
        });
    });
    test('a planner can create a function', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('functions', result.functionId)?.status).toBe('planned');
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot create a function', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('rejects a missing name', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, { ...validInput, status: 'happening' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_status' });
    });
    test('rejects an invalid time range', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, { ...validInput, startTime: '18:00', endTime: '17:00' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_time_range' });
    });
    test('accepts equal start and end times', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createFunction_1.handleCreateFunction)(db, { ...validInput, startTime: '18:00', endTime: '18:00' }, { auth: { uid: 'user1' } });
        expect(fake.read('functions', result.functionId)?.endTime).toBe('18:00');
    });
    test('rejects a malformed start time', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, { ...validInput, startTime: '6pm' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_start_time' });
    });
    test('defaults status to planned when omitted', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('functions', result.functionId)?.status).toBe('planned');
    });
    test('createdBy comes from the authenticated UID, not client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createFunction_1.handleCreateFunction)(db, { ...validInput, createdBy: 'someone-else', id: 'chosen-by-client' }, { auth: { uid: 'user1' } });
        expect(fake.read('functions', result.functionId)?.createdBy).toBe('user1');
    });
    test('an owner of a different event cannot create a function for this event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createFunction_1.handleCreateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
