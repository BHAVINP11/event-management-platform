import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventPeopleService } from '@/features/events/services/eventPeopleService';
import { EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import {
  buildEvent,
  buildEventMember,
  buildInvitation,
  buildUser,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeInvitationRepository,
  FakeOrganizationMemberRepository,
  FakeUserRepository
} from './fakes';

interface WorldOptions {
  events?: ReturnType<typeof buildEvent>[];
  eventMembers?: ReturnType<typeof buildEventMember>[];
  invitations?: ReturnType<typeof buildInvitation>[];
  users?: ReturnType<typeof buildUser>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);
  const invitationRepository = new FakeInvitationRepository(options.invitations ?? []);
  const userRepository = new FakeUserRepository(options.users ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository([]),
    eventMemberRepository
  );

  return {
    eventMemberRepository,
    invitationRepository,
    userRepository,
    service: new EventPeopleService(
      authorizationService,
      eventRepository,
      eventMemberRepository,
      invitationRepository,
      userRepository
    )
  };
};

describe('EventPeopleService.listPeople', () => {
  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })]
    });

    await expect(service.listPeople('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the event document is missing', async () => {
    const { service } = buildWorld({
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    await expect(service.listPeople('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('lists active members and pending invitations only', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [
        buildEventMember('event1', 'user1', { role: EventRole.Owner }),
        buildEventMember('event1', 'user2', { role: EventRole.Couple })
      ],
      invitations: [
        buildInvitation({ id: 'inv1', eventId: 'event1', invitedEmail: 'meena@example.com', status: InvitationStatus.Pending }),
        buildInvitation({ id: 'inv2', eventId: 'event1', invitedEmail: 'old@example.com', status: InvitationStatus.Accepted }),
        buildInvitation({ id: 'inv3', eventId: 'event1', invitedEmail: 'gone@example.com', status: InvitationStatus.Cancelled })
      ]
    });

    const result = await service.listPeople('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.members).toHaveLength(2);
    expect(result.data.invitations).toEqual([
      expect.objectContaining({ invitedEmail: 'meena@example.com', status: InvitationStatus.Pending })
    ]);
  });

  test("resolves the current user's own name but not a co-member's", async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1'), buildEventMember('event1', 'user2')],
      users: [buildUser({ id: 'user1', firstName: 'Bhavin', lastName: 'Patel' })]
    });

    const result = await service.listPeople('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    const self = result.data.members.find((m) => m.userId === 'user1');
    const other = result.data.members.find((m) => m.userId === 'user2');
    expect(self?.label).toBe('Bhavin Patel');
    expect(other?.label).toBeNull();
  });

  test('offers canInvite to an owner', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Owner })]
    });

    const result = await service.listPeople('user1', 'event1');
    expect(result.status === 'allowed' && result.data.canInvite).toBe(true);
  });

  test('offers canInvite to a planner', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Planner })]
    });

    const result = await service.listPeople('user1', 'event1');
    expect(result.status === 'allowed' && result.data.canInvite).toBe(true);
  });

  test('does not offer canInvite to a couple/family/staff/viewer member', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Couple })]
    });

    const result = await service.listPeople('user1', 'event1');
    expect(result.status === 'allowed' && result.data.canInvite).toBe(false);
  });

  test('an inactive membership is denied entirely, not merely offered without canInvite', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Owner, status: MembershipStatus.Inactive })]
    });

    await expect(service.listPeople('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.invitationRepository.failing = true;

    await expect(world.service.listPeople('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });
});
