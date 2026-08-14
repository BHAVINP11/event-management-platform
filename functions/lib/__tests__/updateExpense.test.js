"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateExpense_1 = require("../expenses/updateExpense");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const EXPENSE_ID = 'expense1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedExpense(fake, overrides = {}) {
    fake.seed('expenses', EXPENSE_ID, {
        eventId: EVENT_ID,
        title: 'Venue Booking',
        category: 'venue',
        amount: 200000,
        paymentStatus: 'unpaid',
        paidAmount: 0,
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
const validInput = {
    expenseId: EXPENSE_ID,
    title: 'Venue Booking (Deposit Paid)',
    category: 'venue',
    amount: 200000,
    paymentStatus: 'paid'
};
describe('handleUpdateExpense', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateExpense_1.handleUpdateExpense)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing expense is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'expense_not_found'
        });
    });
    test("a caller with no membership for the expense's event is rejected", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can update an expense', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('expenses', EXPENSE_ID)).toMatchObject({
            title: 'Venue Booking (Deposit Paid)',
            paymentStatus: 'paid',
            paidAmount: 200000
        });
    });
    test('a planner can update an expense', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('expenses', EXPENSE_ID)?.paymentStatus).toBe('paid');
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot update an expense', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('expenses', EXPENSE_ID)?.title).toBe('Venue Booking');
    });
    test('switching to partially_paid recalculates paidAmount from the request', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateExpense_1.handleUpdateExpense)(db, { ...validInput, paymentStatus: 'partially_paid', paidAmount: 50000 }, { auth: { uid: 'user1' } });
        expect(fake.read('expenses', EXPENSE_ID)).toMatchObject({ paymentStatus: 'partially_paid', paidAmount: 50000 });
    });
    test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateExpense_1.handleUpdateExpense)(db, { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' }, { auth: { uid: 'user1' } });
        expect(fake.read('expenses', EXPENSE_ID)).toMatchObject({
            id: EXPENSE_ID,
            eventId: EVENT_ID,
            createdBy: 'owner1',
            createdAt: '2020-01-01T00:00:00.000Z'
        });
    });
    test('rejects an invalid amount', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedExpense(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateExpense_1.handleUpdateExpense)(db, { ...validInput, amount: -5 }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test("an owner of a different event cannot update this event's expense", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedExpense(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateExpense_1.handleUpdateExpense)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
