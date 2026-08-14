"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createTask_1 = require("../tasks/createTask");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const validInput = {
    eventId: EVENT_ID,
    title: 'Book the venue',
    priority: 'high'
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
describe('handleCreateTask', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createTask_1.handleCreateTask)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_not_found'
        });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can create a task', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('tasks', result.taskId)).toMatchObject({
            eventId: EVENT_ID,
            title: 'Book the venue',
            priority: 'high',
            status: 'todo',
            createdBy: 'user1'
        });
    });
    test('a planner can create a task', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('tasks', result.taskId)?.title).toBe('Book the venue');
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot create a task', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
    });
    test('rejects a missing title', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, title: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, status: 'blocked' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_status' });
    });
    test('rejects an invalid priority', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, priority: 'urgent' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_priority' });
    });
    test('rejects an invalid due date', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, dueDate: 'not-a-date' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_due_date' });
    });
    test('defaults status to todo and priority to medium when omitted', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createTask_1.handleCreateTask)(db, { eventId: EVENT_ID, title: 'Book the venue' }, {
            auth: { uid: 'user1' }
        });
        expect(fake.read('tasks', result.taskId)).toMatchObject({ status: 'todo', priority: 'medium' });
    });
    test('an owner can assign a task to an active member of the same event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        seedEventMember(fake, 'staff1', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createTask_1.handleCreateTask)(db, { ...validInput, assignedTo: 'staff1' }, { auth: { uid: 'user1' } });
        expect(fake.read('tasks', result.taskId)?.assignedTo).toBe('staff1');
    });
    test('rejects assigning a task to a user with no membership in this event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, assignedTo: 'stranger1' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_assigned_to' });
    });
    test('rejects assigning a task to an inactive member of the same event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        seedEventMember(fake, 'staff1', { role: 'staff', status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, assignedTo: 'staff1' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_assigned_to' });
    });
    test('rejects assigning a task to a member of a different event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'user1', { eventId: 'event1', role: 'owner' });
        seedEventMember(fake, 'staff1', { eventId: 'event2', role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, { ...validInput, assignedTo: 'staff1' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_assigned_to' });
    });
    test('createdBy comes from the authenticated UID, not client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createTask_1.handleCreateTask)(db, { ...validInput, createdBy: 'someone-else', id: 'chosen-by-client' }, { auth: { uid: 'user1' } });
        expect(fake.read('tasks', result.taskId)?.createdBy).toBe('user1');
    });
    test('an owner of a different event cannot create a task for this event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createTask_1.handleCreateTask)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
