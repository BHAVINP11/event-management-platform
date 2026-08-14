import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { GuestService } from '@/features/events/services/guestService';
import { GuestError, EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
import { GuestSide, GuestStatus } from '@/types/guest';
import {
  buildEvent,
  buildEventMember,
  buildGuest,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeGuestRepository,
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
  guests?: ReturnType<typeof buildGuest>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);
  const guestRepository = new FakeGuestRepository(options.guests ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository([]),
    eventMemberRepository
  );

  return {
    guestRepository,
    service: new GuestService(authorizationService, eventRepository, guestRepository)
  };
};

describe('GuestService.listGuests', () => {
  beforeEach(() => mockCallable.mockReset());

  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({ events: [buildEvent({ id: 'event1' })] });

    await expect(service.listGuests('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the event document is missing', async () => {
    const { service } = buildWorld({ eventMembers: [buildEventMember('event1', 'user1')] });

    await expect(service.listGuests('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an inactive membership is denied', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { status: MembershipStatus.Inactive })]
    });

    await expect(service.listGuests('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('lists the guests for the event', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')],
      guests: [
        buildGuest({ id: 'guest1', eventId: 'event1', name: 'Rajesh Patel' }),
        buildGuest({ id: 'guest2', eventId: 'event1', name: 'Meena Shah' }),
        buildGuest({ id: 'guest3', eventId: 'event2', name: 'Someone Else' })
      ]
    });

    const result = await service.listGuests('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.guests.map((g) => g.name).sort()).toEqual(['Meena Shah', 'Rajesh Patel']);
  });

  test('computes total/bride/groom counts, with "both" guests counted in both sides', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')],
      guests: [
        buildGuest({ id: 'g1', eventId: 'event1', side: GuestSide.Bride }),
        buildGuest({ id: 'g2', eventId: 'event1', side: GuestSide.Bride }),
        buildGuest({ id: 'g3', eventId: 'event1', side: GuestSide.Groom }),
        buildGuest({ id: 'g4', eventId: 'event1', side: GuestSide.Both })
      ]
    });

    const result = await service.listGuests('user1', 'event1');

    expect(result.status === 'allowed' && result.data.counts).toEqual({ total: 4, bride: 3, groom: 2 });
  });

  test('offers canManage to an owner and a planner, not to couple/family/viewer', async () => {
    const ownerWorld = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Owner })]
    });
    const plannerWorld = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Planner })]
    });
    const coupleWorld = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Couple })]
    });
    const viewerWorld = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Viewer })]
    });

    const owner = await ownerWorld.service.listGuests('user1', 'event1');
    const planner = await plannerWorld.service.listGuests('user1', 'event1');
    const couple = await coupleWorld.service.listGuests('user1', 'event1');
    const viewer = await viewerWorld.service.listGuests('user1', 'event1');

    expect(owner.status === 'allowed' && owner.data.canManage).toBe(true);
    expect(planner.status === 'allowed' && planner.data.canManage).toBe(true);
    expect(couple.status === 'allowed' && couple.data.canManage).toBe(false);
    expect(viewer.status === 'allowed' && viewer.data.canManage).toBe(false);
  });

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.guestRepository.failing = true;

    await expect(world.service.listGuests('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });
});

describe('GuestService.createGuest', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the createGuest callable with the eventId included', async () => {
    mockCallable.mockResolvedValue({ data: { guestId: 'guest1' } });
    const { service } = buildWorld();

    const guestId = await service.createGuest('event1', { name: 'Rajesh Patel', side: GuestSide.Bride, status: GuestStatus.Pending });

    expect(guestId).toBe('guest1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateGuest', {
      eventId: 'event1',
      name: 'Rajesh Patel',
      side: GuestSide.Bride,
      status: GuestStatus.Pending
    });
  });

  test('converts a role-not-allowed failure into a friendly GuestError', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(
      service.createGuest('event1', { name: 'Rajesh Patel', side: GuestSide.Bride, status: GuestStatus.Pending })
    ).rejects.toMatchObject({
      code: 'event_role_not_allowed',
      friendlyMessage: "Your role doesn't allow managing guests for this event."
    });
  });

  test('falls back to a generic message for an unrecognized app code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const { service } = buildWorld();

    const error = await service
      .createGuest('event1', { name: 'Rajesh Patel', side: GuestSide.Bride, status: GuestStatus.Pending })
      .catch((e) => e);

    expect(error).toBeInstanceOf(GuestError);
    expect(error.friendlyMessage).toBe('Something went wrong. Please try again.');
  });
});

describe('GuestService.updateGuest', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the updateGuest callable with the guestId included', async () => {
    mockCallable.mockResolvedValue({ data: { guestId: 'guest1' } });
    const { service } = buildWorld();

    await service.updateGuest('guest1', { name: 'Rajesh R. Patel', side: GuestSide.Bride, status: GuestStatus.Confirmed });

    expect(mockCallable).toHaveBeenCalledWith('onUpdateGuest', {
      guestId: 'guest1',
      name: 'Rajesh R. Patel',
      side: GuestSide.Bride,
      status: GuestStatus.Confirmed
    });
  });

  test('surfaces a not-found guest as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'not-found',
      message: 'missing',
      details: { appCode: 'guest_not_found' }
    });
    const { service } = buildWorld();

    await expect(
      service.updateGuest('guest1', { name: 'x', side: GuestSide.Bride, status: GuestStatus.Pending })
    ).rejects.toMatchObject({ friendlyMessage: "We couldn't find this guest." });
  });
});

describe('GuestService.deleteGuest', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the deleteGuest callable', async () => {
    mockCallable.mockResolvedValue({ data: { guestId: 'guest1' } });
    const { service } = buildWorld();

    await service.deleteGuest('guest1');

    expect(mockCallable).toHaveBeenCalledWith('onDeleteGuest', { guestId: 'guest1' });
  });

  test('surfaces an access-denied failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'denied',
      details: { appCode: 'event_access_denied' }
    });
    const { service } = buildWorld();

    await expect(service.deleteGuest('guest1')).rejects.toMatchObject({
      friendlyMessage: "You don't have access to this event."
    });
  });
});
