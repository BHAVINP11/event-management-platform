import { handleCreateTask } from '../tasks/createTask';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';

const validInput = {
  eventId: EVENT_ID,
  title: 'Book the venue',
  priority: 'high'
};

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedEventMember(
  fake: FakeFirestore,
  userId: string,
  overrides: { eventId?: string; status?: string; role?: string; side?: string } = {}
): void {
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
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateTask(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing event is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_not_found'
    });
  });

  test('a caller with no membership for the event is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    const db = asFirestore(fake);

    await expect(handleCreateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an inactive member is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { status: 'revoked' });
    const db = asFirestore(fake);

    await expect(handleCreateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('an owner can create a task', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCreateTask(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('tasks', result.taskId)).toMatchObject({
      eventId: EVENT_ID,
      title: 'Book the venue',
      priority: 'high',
      status: 'todo',
      createdBy: 'user1'
    });
  });

  test('a planner can create a task', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    const result = await handleCreateTask(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('tasks', result.taskId)?.title).toBe('Book the venue');
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot create a task', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleCreateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('rejects a missing title', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, title: '' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid status', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, status: 'blocked' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_status' });
  });

  test('rejects an invalid priority', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, priority: 'urgent' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_priority' });
  });

  test('rejects an invalid due date', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, dueDate: 'not-a-date' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_due_date' });
  });

  test('defaults status to todo and priority to medium when omitted', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateTask(db, { eventId: EVENT_ID, title: 'Book the venue' }, {
      auth: { uid: 'user1' }
    });

    expect(fake.read('tasks', result.taskId)).toMatchObject({ status: 'todo', priority: 'medium' });
  });

  test('an owner can assign a task to an active member of the same event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    seedEventMember(fake, 'staff1', { role: 'staff' });
    const db = asFirestore(fake);

    const result = await handleCreateTask(
      db,
      { ...validInput, assignedTo: 'staff1' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('tasks', result.taskId)?.assignedTo).toBe('staff1');
  });

  test('rejects assigning a task to a user with no membership in this event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, assignedTo: 'stranger1' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_assigned_to' });
  });

  test('rejects assigning a task to an inactive member of the same event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    seedEventMember(fake, 'staff1', { role: 'staff', status: 'inactive' });
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, assignedTo: 'staff1' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_assigned_to' });
  });

  test('rejects assigning a task to a member of a different event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedEventMember(fake, 'user1', { eventId: 'event1', role: 'owner' });
    seedEventMember(fake, 'staff1', { eventId: 'event2', role: 'staff' });
    const db = asFirestore(fake);

    await expect(
      handleCreateTask(db, { ...validInput, assignedTo: 'staff1' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_assigned_to' });
  });

  test('createdBy comes from the authenticated UID, not client input', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateTask(
      db,
      { ...validInput, createdBy: 'someone-else', id: 'chosen-by-client' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('tasks', result.taskId)?.createdBy).toBe('user1');
  });

  test('an owner of a different event cannot create a task for this event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleCreateTask(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
