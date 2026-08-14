import { handleUpdateTask } from '../tasks/updateTask';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const TASK_ID = 'task1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedTask(fake: FakeFirestore, overrides: Record<string, unknown> = {}): void {
  fake.seed('tasks', TASK_ID, {
    eventId: EVENT_ID,
    title: 'Book the venue',
    status: 'todo',
    priority: 'medium',
    createdBy: 'owner1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  });
}

function seedEventMember(
  fake: FakeFirestore,
  eventId: string,
  userId: string,
  overrides: { status?: string; role?: string; side?: string } = {}
): void {
  fake.seed('eventMembers', `${eventId}_${userId}`, {
    eventId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner',
    ...(overrides.side ? { side: overrides.side } : {})
  });
}

const validInput = { taskId: TASK_ID, title: 'Book the venue (confirmed)', status: 'in_progress' };

describe('handleUpdateTask', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleUpdateTask(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing task is reported as not found', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'task_not_found'
    });
  });

  test("a caller with no membership for the task's event is rejected", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can update any task', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateTask(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('tasks', TASK_ID)).toMatchObject({
      title: 'Book the venue (confirmed)',
      status: 'in_progress'
    });
  });

  test('a planner can update any task', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleUpdateTask(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('tasks', TASK_ID)?.status).toBe('in_progress');
  });

  test('a planner can update a task assigned to someone else', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake, { assignedTo: 'staff1' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
    seedEventMember(fake, EVENT_ID, 'staff1', { role: 'staff' });
    const db = asFirestore(fake);

    await handleUpdateTask(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('tasks', TASK_ID)?.status).toBe('in_progress');
  });

  test('staff can update a task assigned to themselves', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake, { assignedTo: 'staff1' });
    seedEventMember(fake, EVENT_ID, 'staff1', { role: 'staff' });
    const db = asFirestore(fake);

    await handleUpdateTask(db, { ...validInput, status: 'completed' }, { auth: { uid: 'staff1' } });

    expect(fake.read('tasks', TASK_ID)?.status).toBe('completed');
  });

  test("staff cannot update another person's task", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake, { assignedTo: 'staff2' });
    seedEventMember(fake, EVENT_ID, 'staff1', { role: 'staff' });
    seedEventMember(fake, EVENT_ID, 'staff2', { role: 'staff' });
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'staff1' } })).rejects.toMatchObject({
      code: 'task_assignment_not_allowed'
    });
    expect(fake.read('tasks', TASK_ID)?.title).toBe('Book the venue');
  });

  test('staff cannot update an unassigned task', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'staff1', { role: 'staff' });
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'staff1' } })).rejects.toMatchObject({
      code: 'task_assignment_not_allowed'
    });
  });

  test.each(['couple', 'family', 'viewer'])('a %s member cannot update a task, even their own', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake, { assignedTo: 'user1' });
    seedEventMember(fake, EVENT_ID, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleUpdateTask(
      db,
      { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('tasks', TASK_ID)).toMatchObject({
      id: TASK_ID,
      eventId: EVENT_ID,
      createdBy: 'owner1',
      createdAt: '2020-01-01T00:00:00.000Z'
    });
  });

  test('rejects an invalid priority', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleUpdateTask(db, { ...validInput, priority: 'urgent' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('an owner can reassign a task to another active member of the same event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    seedEventMember(fake, EVENT_ID, 'staff1', { role: 'staff' });
    const db = asFirestore(fake);

    await handleUpdateTask(db, { ...validInput, assignedTo: 'staff1' }, { auth: { uid: 'user1' } });

    expect(fake.read('tasks', TASK_ID)?.assignedTo).toBe('staff1');
  });

  test('rejects reassigning a task to a user with no membership in this event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedTask(fake);
    seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(
      handleUpdateTask(db, { ...validInput, assignedTo: 'stranger1' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_assigned_to' });
  });

  test("an owner of a different event cannot update this event's task", async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedTask(fake, { eventId: 'event1' });
    seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleUpdateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
