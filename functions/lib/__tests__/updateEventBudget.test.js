"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateEventBudget_1 = require("../events/updateEventBudget");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
function seedEvent(fake, eventId = EVENT_ID, overrides = {}) {
    fake.seed('events', eventId, {
        id: eventId,
        name: 'Bhavin & Priya Wedding',
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
const validInput = { eventId: EVENT_ID, budgetAmount: 1000000 };
describe('handleUpdateEventBudget', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can set the budget', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } });
        expect(result).toEqual({ eventId: EVENT_ID, budgetAmount: 1000000 });
        expect(fake.read('events', EVENT_ID)?.budgetAmount).toBe(1000000);
    });
    test('a planner can set the budget', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)?.budgetAmount).toBe(1000000);
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot set the budget', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('accepts a zero budget', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEventBudget_1.handleUpdateEventBudget)(db, { eventId: EVENT_ID, budgetAmount: 0 }, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)?.budgetAmount).toBe(0);
    });
    test('rejects a negative budget', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, { eventId: EVENT_ID, budgetAmount: -1 }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_budget_amount' });
    });
    test('rejects a non-numeric budget', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, { eventId: EVENT_ID, budgetAmount: 'a lot' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('does not modify other event fields', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { name: 'Bhavin & Priya Wedding', type: 'wedding' });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)).toMatchObject({ name: 'Bhavin & Priya Wedding', type: 'wedding' });
    });
    test('an owner of a different event cannot set this event\'s budget', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateEventBudget_1.handleUpdateEventBudget)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
