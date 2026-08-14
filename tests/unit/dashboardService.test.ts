import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { DashboardService } from '@/features/dashboard/services/dashboardService';
import { DashboardLoadError } from '@/lib/appError';
import { EventStatus } from '@/types/event';
import { MembershipStatus, OrganizationRole } from '@/types/membership';
import {
  buildEvent,
  buildEventMember,
  buildOrganization,
  buildOrganizationMember,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeOrganizationMemberRepository,
  FakeOrganizationRepository
} from './fakes';

const now = new Date('2026-06-01T00:00:00.000Z');

interface WorldOptions {
  organizations?: ReturnType<typeof buildOrganization>[];
  organizationMembers?: ReturnType<typeof buildOrganizationMember>[];
  events?: ReturnType<typeof buildEvent>[];
  eventMembers?: ReturnType<typeof buildEventMember>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const organizationRepository = new FakeOrganizationRepository(options.organizations ?? []);
  const organizationMemberRepository = new FakeOrganizationMemberRepository(
    options.organizationMembers ?? []
  );
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);

  const authorizationService = new AuthorizationService(
    organizationMemberRepository,
    eventMemberRepository
  );

  return {
    organizationRepository,
    organizationMemberRepository,
    eventRepository,
    eventMemberRepository,
    service: new DashboardService(authorizationService, organizationRepository, eventRepository)
  };
};

describe('DashboardService', () => {
  test('a user with one organization sees it', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1', name: 'Royal Events', description: 'Weddings' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.organizations).toEqual([
      { id: 'org1', name: 'Royal Events', description: 'Weddings', role: OrganizationRole.Owner }
    ]);
  });

  test('a user with multiple organizations sees every active membership', async () => {
    const { service } = buildWorld({
      organizations: [
        buildOrganization({ id: 'org1', name: 'Royal Events' }),
        buildOrganization({ id: 'org2', name: 'Event Planning' })
      ],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1'),
        buildOrganizationMember('org2', 'user1', { role: OrganizationRole.Planner })
      ]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.organizations.map((o) => o.name).sort()).toEqual(['Event Planning', 'Royal Events']);
  });

  test('inactive organization memberships are not displayed', async () => {
    const { service, organizationRepository } = buildWorld({
      organizations: [
        buildOrganization({ id: 'org1', name: 'Royal Events' }),
        buildOrganization({ id: 'org2', name: 'Revoked Org' }),
        buildOrganization({ id: 'org3', name: 'Pending Org' })
      ],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1'),
        buildOrganizationMember('org2', 'user1', { status: MembershipStatus.Revoked }),
        buildOrganizationMember('org3', 'user1', { status: MembershipStatus.Pending })
      ]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.organizations.map((o) => o.name)).toEqual(['Royal Events']);
    // Inactive memberships must not even cause a document read.
    expect(organizationRepository.reads).toEqual(['org1']);
  });

  test('a user with one event sees it', async () => {
    const { service } = buildWorld({
      events: [
        buildEvent({
          id: 'event1',
          name: 'Bhavin & Priya Wedding',
          startDate: '2027-02-12T10:00:00.000Z',
          status: EventStatus.Draft
        })
      ],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events).toHaveLength(1);
    expect(data.events[0]).toMatchObject({
      id: 'event1',
      name: 'Bhavin & Priya Wedding',
      status: EventStatus.Draft,
      startDate: '2027-02-12T10:00:00.000Z'
    });
  });

  test('a user with multiple events sees every active membership', async () => {
    const { service } = buildWorld({
      events: [
        buildEvent({ id: 'event1', name: 'Wedding A', startDate: '2027-02-12T00:00:00.000Z' }),
        buildEvent({ id: 'event2', name: 'Wedding B', startDate: '2026-12-24T00:00:00.000Z' })
      ],
      eventMembers: [buildEventMember('event1', 'user1'), buildEventMember('event2', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events.map((e) => e.id).sort()).toEqual(['event1', 'event2']);
  });

  test('inactive event memberships are not displayed', async () => {
    const { service, eventRepository } = buildWorld({
      events: [
        buildEvent({ id: 'event1', name: 'Active Event' }),
        buildEvent({ id: 'event2', name: 'Inactive Event' })
      ],
      eventMembers: [
        buildEventMember('event1', 'user1'),
        buildEventMember('event2', 'user1', { status: MembershipStatus.Inactive })
      ]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events.map((e) => e.name)).toEqual(['Active Event']);
    expect(eventRepository.reads).toEqual(['event1']);
  });

  test('a user does not see organizations they do not belong to', async () => {
    const { service, organizationRepository } = buildWorld({
      organizations: [
        buildOrganization({ id: 'org1', name: 'Mine' }),
        buildOrganization({ id: 'org2', name: 'Someone Else' })
      ],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1'),
        buildOrganizationMember('org2', 'user2')
      ]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.organizations.map((o) => o.name)).toEqual(['Mine']);
    expect(organizationRepository.reads).not.toContain('org2');
  });

  test('a user does not see events they do not belong to', async () => {
    const { service, eventRepository } = buildWorld({
      events: [
        buildEvent({ id: 'event1', name: 'Mine' }),
        buildEvent({ id: 'event2', name: 'Someone Else' })
      ],
      eventMembers: [buildEventMember('event1', 'user1'), buildEventMember('event2', 'user2')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events.map((e) => e.name)).toEqual(['Mine']);
    expect(eventRepository.reads).not.toContain('event2');
  });

  test('an organization event resolves its organization name when the user has organization access', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1', name: 'Royal Events' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')],
      events: [buildEvent({ id: 'event1', organizationId: 'org1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events[0]).toMatchObject({ organizationId: 'org1', organizationName: 'Royal Events' });
  });

  test('an organization event hides the organization name when the user is only an event member', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1', name: 'Royal Events' })],
      events: [buildEvent({ id: 'event1', organizationId: 'org1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events[0]).toMatchObject({ organizationId: 'org1', organizationName: null });
    expect(data.organizations).toEqual([]);
  });

  test('an individual event with organizationId = null displays correctly', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1', organizationId: null })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events[0]).toMatchObject({ organizationId: null, organizationName: null });
  });

  test('upcoming events sort earliest first, ahead of undated and past events', async () => {
    const { service } = buildWorld({
      events: [
        buildEvent({ id: 'past', name: 'Past', startDate: '2026-01-10T00:00:00.000Z' }),
        buildEvent({ id: 'later', name: 'Later', startDate: '2027-02-12T00:00:00.000Z' }),
        buildEvent({ id: 'undated', name: 'Undated' }),
        buildEvent({ id: 'soon', name: 'Soon', startDate: '2026-12-24T00:00:00.000Z' })
      ],
      eventMembers: [
        buildEventMember('past', 'user1'),
        buildEventMember('later', 'user1'),
        buildEventMember('undated', 'user1'),
        buildEventMember('soon', 'user1')
      ]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events.map((e) => e.id)).toEqual(['soon', 'later', 'undated', 'past']);
  });

  test('an in-progress event still counts as upcoming until its end date passes', async () => {
    const { service } = buildWorld({
      events: [
        buildEvent({
          id: 'inProgress',
          name: 'In progress',
          startDate: '2026-05-30T00:00:00.000Z',
          endDate: '2026-06-03T00:00:00.000Z'
        }),
        buildEvent({ id: 'later', name: 'Later', startDate: '2026-07-01T00:00:00.000Z' })
      ],
      eventMembers: [buildEventMember('inProgress', 'user1'), buildEventMember('later', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events.map((e) => e.id)).toEqual(['inProgress', 'later']);
  });

  test('memberships pointing at a removed document are skipped', async () => {
    const { service } = buildWorld({
      eventMembers: [buildEventMember('deleted-event', 'user1')],
      organizationMembers: [buildOrganizationMember('deleted-org', 'user1')]
    });

    const data = await service.getDashboardData('user1', now);

    expect(data.events).toEqual([]);
    expect(data.organizations).toEqual([]);
  });

  test('a repository failure surfaces an application error, not an empty dashboard', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.eventMemberRepository.failing = true;

    await expect(world.service.getDashboardData('user1', now)).rejects.toBeInstanceOf(
      DashboardLoadError
    );
  });

  test('the friendly message never leaks infrastructure detail', async () => {
    const world = buildWorld({});
    world.organizationMemberRepository.failing = true;

    await expect(world.service.getDashboardData('user1', now)).rejects.toMatchObject({
      friendlyMessage: "We couldn't load your dashboard right now."
    });
  });

  test('an unauthenticated call is rejected', async () => {
    const { service } = buildWorld({});

    await expect(service.getDashboardData('', now)).rejects.toBeInstanceOf(DashboardLoadError);
  });
});
