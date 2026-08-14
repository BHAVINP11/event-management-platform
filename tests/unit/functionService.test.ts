import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { FunctionService } from '@/features/events/services/functionService';
import { FunctionError, EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
import { EventFunctionStatus } from '@/types/eventFunction';
import {
  buildEvent,
  buildEventFunction,
  buildEventMember,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeFunctionRepository,
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
  functionsList?: ReturnType<typeof buildEventFunction>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);
  const functionRepository = new FakeFunctionRepository(options.functionsList ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository([]),
    eventMemberRepository
  );

  return {
    functionRepository,
    service: new FunctionService(authorizationService, eventRepository, functionRepository)
  };
};

describe('FunctionService.listFunctions', () => {
  beforeEach(() => mockCallable.mockReset());

  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({ events: [buildEvent({ id: 'event1' })] });

    await expect(service.listFunctions('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the event document is missing', async () => {
    const { service } = buildWorld({ eventMembers: [buildEventMember('event1', 'user1')] });

    await expect(service.listFunctions('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an inactive membership is denied', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { status: MembershipStatus.Inactive })]
    });

    await expect(service.listFunctions('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('lists every function for the event, regardless of side/role', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Viewer })],
      functionsList: [
        buildEventFunction({ id: 'f1', eventId: 'event1', name: 'Mehndi' }),
        buildEventFunction({ id: 'f2', eventId: 'event1', name: 'Sangeet' }),
        buildEventFunction({ id: 'f3', eventId: 'event2', name: "Someone Else's Wedding" })
      ]
    });

    const result = await service.listFunctions('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.functions.map((f) => f.name).sort()).toEqual(['Mehndi', 'Sangeet']);
  });

  test.each([EventRole.Owner, EventRole.Planner])('offers canManage to %s', async (role) => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role })]
    });

    const result = await service.listFunctions('user1', 'event1');

    expect(result.status === 'allowed' && result.data.canManage).toBe(true);
  });

  test.each([EventRole.Couple, EventRole.Family, EventRole.Staff, EventRole.Viewer])(
    'does not offer canManage to %s',
    async (role) => {
      const { service } = buildWorld({
        events: [buildEvent({ id: 'event1' })],
        eventMembers: [buildEventMember('event1', 'user1', { role })]
      });

      const result = await service.listFunctions('user1', 'event1');

      expect(result.status === 'allowed' && result.data.canManage).toBe(false);
    }
  );

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.functionRepository.failing = true;

    await expect(world.service.listFunctions('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });
});

describe('FunctionService.createFunction', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the createFunction callable with the eventId included', async () => {
    mockCallable.mockResolvedValue({ data: { functionId: 'function1' } });
    const { service } = buildWorld();

    const functionId = await service.createFunction('event1', {
      name: 'Mehndi',
      venue: 'Royal Palace',
      status: EventFunctionStatus.Planned
    });

    expect(functionId).toBe('function1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateFunction', {
      eventId: 'event1',
      name: 'Mehndi',
      venue: 'Royal Palace',
      status: EventFunctionStatus.Planned
    });
  });

  test('converts a role-not-allowed failure into a friendly FunctionError', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(
      service.createFunction('event1', { name: 'Mehndi', status: EventFunctionStatus.Planned })
    ).rejects.toMatchObject({
      code: 'event_role_not_allowed',
      friendlyMessage: "Your role doesn't allow managing functions for this event."
    });
  });

  test('converts an invalid time range failure into a friendly FunctionError', async () => {
    mockCallable.mockRejectedValue({
      code: 'invalid-argument',
      message: 'bad range',
      details: { appCode: 'invalid_time_range' }
    });
    const { service } = buildWorld();

    await expect(
      service.createFunction('event1', { name: 'Mehndi', status: EventFunctionStatus.Planned })
    ).rejects.toMatchObject({ friendlyMessage: 'End time cannot be before start time.' });
  });

  test('falls back to a generic message for an unrecognized app code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const { service } = buildWorld();

    const error = await service
      .createFunction('event1', { name: 'Mehndi', status: EventFunctionStatus.Planned })
      .catch((e) => e);

    expect(error).toBeInstanceOf(FunctionError);
    expect(error.friendlyMessage).toBe('Something went wrong. Please try again.');
  });
});

describe('FunctionService.updateFunction', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the updateFunction callable with the functionId included', async () => {
    mockCallable.mockResolvedValue({ data: { functionId: 'function1' } });
    const { service } = buildWorld();

    await service.updateFunction('function1', { name: 'Mehndi Ceremony', status: EventFunctionStatus.Confirmed });

    expect(mockCallable).toHaveBeenCalledWith('onUpdateFunction', {
      functionId: 'function1',
      name: 'Mehndi Ceremony',
      status: EventFunctionStatus.Confirmed
    });
  });

  test('surfaces a not-found function as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'not-found',
      message: 'missing',
      details: { appCode: 'function_not_found' }
    });
    const { service } = buildWorld();

    await expect(
      service.updateFunction('function1', { name: 'x', status: EventFunctionStatus.Planned })
    ).rejects.toMatchObject({ friendlyMessage: "We couldn't find this function." });
  });
});

describe('FunctionService.deleteFunction', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the deleteFunction callable', async () => {
    mockCallable.mockResolvedValue({ data: { functionId: 'function1' } });
    const { service } = buildWorld();

    await service.deleteFunction('function1');

    expect(mockCallable).toHaveBeenCalledWith('onDeleteFunction', { functionId: 'function1' });
  });

  test('surfaces an access-denied failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'denied',
      details: { appCode: 'event_access_denied' }
    });
    const { service } = buildWorld();

    await expect(service.deleteFunction('function1')).rejects.toMatchObject({
      friendlyMessage: "You don't have access to this event."
    });
  });
});
