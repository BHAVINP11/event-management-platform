"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteTask_1 = require("../tasks/deleteTask");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const TASK_ID = 'task1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedTask(fake, overrides = {}) {
    fake.seed('tasks', TASK_ID, {
        eventId: overrides.eventId ?? EVENT_ID,
        title: 'Book the venue',
        status: 'todo',
        priority: 'medium',
        ...(overrides.assignedTo ? { assignedTo: overrides.assignedTo } : {}),
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
const deleteInput = { taskId: TASK_ID };
describe('handleDeleteTask', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing task is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'task_not_found'
        });
    });
    test("a caller with no membership for the task's event is rejected, and the task survives", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedTask(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('tasks', TASK_ID)).toBeDefined();
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedTask(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can delete a task', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedTask(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(result).toEqual({ taskId: TASK_ID });
        expect(fake.read('tasks', TASK_ID)).toBeUndefined();
    });
    test('a planner can delete a task', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedTask(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } });
        expect(fake.read('tasks', TASK_ID)).toBeUndefined();
    });
    test('staff cannot delete a task, even one assigned to themselves', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedTask(fake, { assignedTo: 'staff1' });
        seedEventMember(fake, EVENT_ID, 'staff1', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'staff1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('tasks', TASK_ID)).toBeDefined();
    });
    test.each(['couple', 'family', 'viewer'])('a %s member cannot delete a task', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedTask(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('tasks', TASK_ID)).toBeDefined();
    });
    test("an owner of a different event cannot delete this event's task", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedTask(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, deleteTask_1.handleDeleteTask)(db, deleteInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
        expect(fake.read('tasks', TASK_ID)).toBeDefined();
    });
});
