import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventAccessService } from '@/features/events/services/eventAccessService';
import { EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
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

interface WorldOptions {
  organizations?: ReturnType<typeof buildOrganization>[];
  organizationMembers?: ReturnType<typeof buildOrganizationMember>[];
  events?: ReturnType<typeof buildEvent>[];
  eventMembers?: ReturnType<typeof buildEventMember>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const organizationRepository = new FakeOrganizationRepository(options.organizations ?? []);
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository(options.organizationMembers ?? []),
    eventMemberRepository
  );

  return {
    eventRepository,
    eventMemberRepository,
    service: new EventAccessService(authorizationService, eventRepository, organizationRepository)
  };
};

describe('EventAccessService', () => {
  test('an authorized user can open an accessible event', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1', name: 'Bhavin & Priya Wedding' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Couple })]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toMatchObject({
      status: 'allowed',
      event: { id: 'event1', name: 'Bhavin & Priya Wedding', role: EventRole.Couple }
    });
  });

  test('a user with no membership cannot open the event, even with a direct URL', async () => {
    const { service, eventRepository } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user2')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toEqual({ status: 'denied' });
    // The event document is never read for an unauthorized user.
    expect(eventRepository.reads).toEqual([]);
  });

  test('a user with an inactive membership cannot open the event', async () => {
    const { service, eventRepository } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { status: MembershipStatus.Revoked })]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toEqual({ status: 'denied' });
    expect(eventRepository.reads).toEqual([]);
  });

  test('an unauthenticated caller is denied', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    await expect(service.loadEvent('', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('a missing event shows the not-found state', async () => {
    const { service } = buildWorld({
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    await expect(service.loadEvent('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an organization event resolves its organization name when the user has organization access', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1', name: 'Royal Events' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')],
      events: [buildEvent({ id: 'event1', organizationId: 'org1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toMatchObject({ status: 'allowed', event: { organizationName: 'Royal Events' } });
  });

  test('event membership alone does not grant organization data', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1', name: 'Royal Events' })],
      events: [buildEvent({ id: 'event1', organizationId: 'org1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toMatchObject({
      status: 'allowed',
      event: { organizationId: 'org1', organizationName: null }
    });
  });

  test('projects the budget amount already present on the loaded event, at no extra read cost', async () => {
    const { service, eventRepository } = buildWorld({
      events: [buildEvent({ id: 'event1', budgetAmount: 1000000 })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toMatchObject({ status: 'allowed', event: { budgetAmount: 1000000 } });
    expect(eventRepository.reads).toEqual(['event1']);
  });

  test('omits the budget amount when the event has none set', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status === 'allowed') {
      expect(result.event.budgetAmount).toBeUndefined();
    }
  });

  test('projects the cover image URL already present on the loaded event, at no extra read cost', async () => {
    const { service, eventRepository } = buildWorld({
      events: [buildEvent({ id: 'event1', coverImageUrl: 'https://example.com/cover.jpg' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result).toMatchObject({ status: 'allowed', event: { coverImageUrl: 'https://example.com/cover.jpg' } });
    expect(eventRepository.reads).toEqual(['event1']);
  });

  test('omits the cover image URL when the event has none set', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });

    const result = await service.loadEvent('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status === 'allowed') {
      expect(result.event.coverImageUrl).toBeUndefined();
    }
  });

  test('a read failure surfaces an application error rather than an access denial', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.eventMemberRepository.failing = true;

    await expect(world.service.loadEvent('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });

  test('a failure loading the event document is reported as a friendly error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.eventRepository.failing = true;

    await expect(world.service.loadEvent('user1', 'event1')).rejects.toMatchObject({
      friendlyMessage: "We couldn't load this event right now."
    });
  });
});
