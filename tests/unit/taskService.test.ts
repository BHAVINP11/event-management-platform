import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventPeopleService } from '@/features/events/services/eventPeopleService';
import { TaskService } from '@/features/events/services/taskService';
import { TaskError, EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
import { TaskPriority, TaskStatus } from '@/types/task';
import {
  buildEvent,
  buildEventMember,
  buildTask,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeInvitationRepository,
  FakeTaskRepository,
  FakeUserRepository,
  FakeOrganizationMemberRepository
} from './fakes';

const mockCallable = jest.fn();

jest.mock('@/services/firebase/functions', () => ({ functions: {} }));
jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (input: unknown) => mockCallable(name, input)
}));

interface WorldOptions {
  events?: ReturnType<typeof buildEvent>[];
  eventMembers?: ReturnType<typeof buildEventMember>[];
  tasks?: ReturnType<typeof buildTask>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);
  const taskRepository = new FakeTaskRepository(options.tasks ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository([]),
    eventMemberRepository
  );

  const eventPeopleService = new EventPeopleService(
    authorizationService,
    eventRepository,
    eventMemberRepository,
    new FakeInvitationRepository([]),
    new FakeUserRepository([])
  );

  return {
    taskRepository,
    service: new TaskService(authorizationService, eventRepository, taskRepository, eventPeopleService)
  };
};

describe('TaskService.listTasks', () => {
  beforeEach(() => mockCallable.mockReset());

  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({ events: [buildEvent({ id: 'event1' })] });

    await expect(service.listTasks('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the event document is missing', async () => {
    const { service } = buildWorld({ eventMembers: [buildEventMember('event1', 'user1')] });

    await expect(service.listTasks('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an inactive membership is denied', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { status: MembershipStatus.Inactive })]
    });

    await expect(service.listTasks('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('lists every task for the event, regardless of role', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Viewer })],
      tasks: [
        buildTask({ id: 't1', eventId: 'event1', title: 'Book the venue' }),
        buildTask({ id: 't2', eventId: 'event1', title: 'Send invitations' }),
        buildTask({ id: 't3', eventId: 'event2', title: "Someone Else's Task" })
      ]
    });

    const result = await service.listTasks('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.tasks.map((t) => t.title).sort()).toEqual(['Book the venue', 'Send invitations']);
  });

  test.each([EventRole.Owner, EventRole.Planner])('offers canManageAll to %s', async (role) => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role })]
    });

    const result = await service.listTasks('user1', 'event1');

    expect(result.status === 'allowed' && result.data.canManageAll).toBe(true);
  });

  test.each([EventRole.Couple, EventRole.Family, EventRole.Staff, EventRole.Viewer])(
    'does not offer canManageAll to %s',
    async (role) => {
      const { service } = buildWorld({
        events: [buildEvent({ id: 'event1' })],
        eventMembers: [buildEventMember('event1', 'user1', { role })]
      });

      const result = await service.listTasks('user1', 'event1');

      expect(result.status === 'allowed' && result.data.canManageAll).toBe(false);
    }
  );

  test('assignableMembers only includes active event members', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [
        buildEventMember('event1', 'user1', { role: EventRole.Owner }),
        buildEventMember('event1', 'staff1', { role: EventRole.Staff, status: MembershipStatus.Active }),
        buildEventMember('event1', 'staff2', { role: EventRole.Staff, status: MembershipStatus.Inactive })
      ]
    });

    const result = await service.listTasks('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    const assignableIds = result.data.assignableMembers.map((m) => m.userId).sort();
    expect(assignableIds).toEqual(['staff1', 'user1']);
  });

  test('memberLabelByUserId includes every member regardless of status', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [
        buildEventMember('event1', 'user1', { role: EventRole.Owner }),
        buildEventMember('event1', 'staff2', { role: EventRole.Staff, status: MembershipStatus.Inactive })
      ]
    });

    const result = await service.listTasks('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(Object.keys(result.data.memberLabelByUserId).sort()).toEqual(['staff2', 'user1']);
  });

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.taskRepository.failing = true;

    await expect(world.service.listTasks('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });
});

describe('TaskService.createTask', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the createTask callable with the eventId included', async () => {
    mockCallable.mockResolvedValue({ data: { taskId: 'task1' } });
    const { service } = buildWorld();

    const taskId = await service.createTask('event1', {
      title: 'Book the venue',
      priority: TaskPriority.High,
      status: TaskStatus.Todo
    });

    expect(taskId).toBe('task1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateTask', {
      eventId: 'event1',
      title: 'Book the venue',
      priority: TaskPriority.High,
      status: TaskStatus.Todo
    });
  });

  test('converts a role-not-allowed failure into a friendly TaskError', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(
      service.createTask('event1', { title: 'Book the venue', priority: TaskPriority.Medium, status: TaskStatus.Todo })
    ).rejects.toMatchObject({ code: 'event_role_not_allowed' });
  });

  test('converts an invalid assignedTo failure into a friendly TaskError', async () => {
    mockCallable.mockRejectedValue({
      code: 'invalid-argument',
      message: 'bad assignee',
      details: { appCode: 'invalid_assigned_to' }
    });
    const { service } = buildWorld();

    await expect(
      service.createTask('event1', {
        title: 'Book the venue',
        priority: TaskPriority.Medium,
        status: TaskStatus.Todo,
        assignedTo: 'stranger1'
      })
    ).rejects.toMatchObject({ friendlyMessage: 'Please assign this task to an active member of this event.' });
  });

  test('falls back to a generic message for an unrecognized app code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const { service } = buildWorld();

    const error = await service
      .createTask('event1', { title: 'Book the venue', priority: TaskPriority.Medium, status: TaskStatus.Todo })
      .catch((e) => e);

    expect(error).toBeInstanceOf(TaskError);
    expect(error.friendlyMessage).toBe('Something went wrong. Please try again.');
  });
});

describe('TaskService.updateTask', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the updateTask callable with the taskId included', async () => {
    mockCallable.mockResolvedValue({ data: { taskId: 'task1' } });
    const { service } = buildWorld();

    await service.updateTask('task1', {
      title: 'Book the venue (confirmed)',
      priority: TaskPriority.High,
      status: TaskStatus.InProgress
    });

    expect(mockCallable).toHaveBeenCalledWith('onUpdateTask', {
      taskId: 'task1',
      title: 'Book the venue (confirmed)',
      priority: TaskPriority.High,
      status: TaskStatus.InProgress
    });
  });

  test('surfaces a task-assignment-not-allowed failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not your task',
      details: { appCode: 'task_assignment_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(
      service.updateTask('task1', { title: 'x', priority: TaskPriority.Low, status: TaskStatus.Completed })
    ).rejects.toMatchObject({ friendlyMessage: 'You may only update tasks assigned to you.' });
  });

  test('surfaces a not-found task as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'not-found',
      message: 'missing',
      details: { appCode: 'task_not_found' }
    });
    const { service } = buildWorld();

    await expect(
      service.updateTask('task1', { title: 'x', priority: TaskPriority.Low, status: TaskStatus.Todo })
    ).rejects.toMatchObject({ friendlyMessage: "We couldn't find this task." });
  });
});

describe('TaskService.deleteTask', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the deleteTask callable', async () => {
    mockCallable.mockResolvedValue({ data: { taskId: 'task1' } });
    const { service } = buildWorld();

    await service.deleteTask('task1');

    expect(mockCallable).toHaveBeenCalledWith('onDeleteTask', { taskId: 'task1' });
  });

  test('surfaces an access-denied failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'denied',
      details: { appCode: 'event_access_denied' }
    });
    const { service } = buildWorld();

    await expect(service.deleteTask('task1')).rejects.toMatchObject({
      friendlyMessage: "You don't have access to this event."
    });
  });
});
