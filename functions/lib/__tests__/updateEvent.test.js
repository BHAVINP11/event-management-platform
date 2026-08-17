"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateEvent_1 = require("../events/updateEvent");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
function seedEvent(fake, eventId = EVENT_ID, overrides = {}) {
    fake.seed('events', eventId, {
        id: eventId,
        name: 'Bhavin & Priya Wedding',
        type: 'wedding',
        startDate: '2026-06-01T00:00:00.000Z',
        timezone: 'Asia/Kolkata',
        organizationId: null,
        createdBy: 'user1',
        status: 'draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
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
const validInput = {
    eventId: EVENT_ID,
    name: 'Bhavin & Priya Wedding',
    type: 'wedding',
    startDate: '2026-06-01T00:00:00.000Z',
    timezone: 'Asia/Kolkata',
    status: 'active'
};
describe('handleUpdateEvent', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateEvent_1.handleUpdateEvent)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can edit the event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, updateEvent_1.handleUpdateEvent)(db, { ...validInput, name: 'New Name', venueName: 'The Grand Hall' }, { auth: { uid: 'user1' } });
        expect(result).toEqual({ eventId: EVENT_ID });
        expect(fake.read('events', EVENT_ID)).toMatchObject({
            name: 'New Name',
            venueName: 'The Grand Hall',
            status: 'active'
        });
    });
    test('a planner can edit the event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)).toMatchObject({ status: 'active' });
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot edit the event', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('rejects an invalid status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEvent_1.handleUpdateEvent)(db, { ...validInput, status: 'not_a_status' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_status' });
    });
    test('rejects an invalid name', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEvent_1.handleUpdateEvent)(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('clears an optional field (removing the venue)', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { venueName: 'Old Venue', venueAddress: '123 Old St' });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } });
        const stored = fake.read('events', EVENT_ID);
        expect(stored?.venueName).toBeUndefined();
        expect(stored?.venueAddress).toBeUndefined();
    });
    test('does not modify budgetAmount or coverImageUrl', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { budgetAmount: 500000, coverImageUrl: 'https://example.com/cover.jpg' });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)).toMatchObject({
            budgetAmount: 500000,
            coverImageUrl: 'https://example.com/cover.jpg'
        });
    });
    test('preserves createdBy, createdAt, and organizationId', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, {
            createdBy: 'original-owner',
            createdAt: '2025-01-01T00:00:00.000Z',
            organizationId: 'org1'
        });
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)).toMatchObject({
            createdBy: 'original-owner',
            createdAt: '2025-01-01T00:00:00.000Z',
            organizationId: 'org1'
        });
    });
    test('an owner of a different event cannot edit this event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEvent_1.handleUpdateEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
