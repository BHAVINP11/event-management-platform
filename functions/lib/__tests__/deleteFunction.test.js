"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteFunction_1 = require("../ceremonies/deleteFunction");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const FUNCTION_ID = 'function1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedFunction(fake, overrides = {}) {
    fake.seed('functions', FUNCTION_ID, {
        eventId: overrides.eventId ?? EVENT_ID,
        name: 'Mehndi',
        status: 'planned',
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
const deleteInput = { functionId: FUNCTION_ID };
describe('handleDeleteFunction', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing function is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'function_not_found'
        });
    });
    test("a caller with no membership for the function's event is rejected, and the function survives", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('functions', FUNCTION_ID)).toBeDefined();
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can delete a function', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(result).toEqual({ functionId: FUNCTION_ID });
        expect(fake.read('functions', FUNCTION_ID)).toBeUndefined();
    });
    test('a planner can delete a function', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(fake.read('functions', FUNCTION_ID)).toBeUndefined();
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot delete a function', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedFunction(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('functions', FUNCTION_ID)).toBeDefined();
    });
    test("an owner of a different event cannot delete this event's function", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedFunction(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteFunction_1.handleDeleteFunction)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('functions', FUNCTION_ID)).toBeDefined();
    });
});
