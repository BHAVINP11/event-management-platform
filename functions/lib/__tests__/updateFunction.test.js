"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateFunction_1 = require("../ceremonies/updateFunction");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const FUNCTION_ID = 'function1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedFunction(fake, overrides = {}) {
    fake.seed('functions', FUNCTION_ID, {
        eventId: EVENT_ID,
        name: 'Mehndi',
        status: 'planned',
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
        role: overrides.role ?? 'owner',
        ...(overrides.side ? { side: overrides.side } : {})
    });
}
const validInput = { functionId: FUNCTION_ID, name: 'Mehndi Ceremony', status: 'confirmed', venue: 'Royal Palace' };
describe('handleUpdateFunction', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateFunction_1.handleUpdateFunction)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing function is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'function_not_found'
        });
    });
    test("a caller with no membership for the function's event is rejected", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can update a function', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('functions', FUNCTION_ID)).toMatchObject({
            name: 'Mehndi Ceremony',
            status: 'confirmed',
            venue: 'Royal Palace'
        });
    });
    test('a planner can update a function', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('functions', FUNCTION_ID)?.status).toBe('confirmed');
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot update a function', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('functions', FUNCTION_ID)?.name).toBe('Mehndi');
    });
    test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateFunction_1.handleUpdateFunction)(db, { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' }, { auth: { uid: 'user1' } });
        expect(fake.read('functions', FUNCTION_ID)).toMatchObject({
            id: FUNCTION_ID,
            eventId: EVENT_ID,
            createdBy: 'owner1',
            createdAt: '2020-01-01T00:00:00.000Z'
        });
    });
    test('rejects an invalid status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, { ...validInput, status: 'happening' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid time range', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, { ...validInput, startTime: '18:00', endTime: '17:00' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_time_range' });
    });
    test("an owner of a different event cannot update this event's function", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedFunction(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateFunction_1.handleUpdateFunction)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
