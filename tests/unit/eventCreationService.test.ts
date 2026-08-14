import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventCreationService } from '@/features/events/services/eventCreationService';
import { EventCreationFormInput } from '@/features/events/types/eventCreation';
import { EventCreationError } from '@/lib/appError';
import { EventType } from '@/types/event';
import { MembershipStatus, OrganizationRole } from '@/types/membership';
import {
  buildOrganization,
  buildOrganizationMember,
  FakeEventMemberRepository,
  FakeOrganizationMemberRepository,
  FakeOrganizationRepository
} from './fakes';

const mockCallable = jest.fn();

jest.mock('@/services/firebase/functions', () => ({ functions: {} }));
jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (input: unknown) => mockCallable(name, input)
}));

const formInput: EventCreationFormInput = {
  name: 'Bhavin & Priya Wedding',
  type: EventType.Wedding,
  startDate: '2027-02-12T10:00:00.000Z',
  timezone: 'Asia/Kolkata'
};

const buildService = (
  organizations: ReturnType<typeof buildOrganization>[] = [],
  organizationMembers: ReturnType<typeof buildOrganizationMember>[] = []
): EventCreationService => {
  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository(organizationMembers),
    // Not exercised by these tests.
    new FakeEventMemberRepository([])
  );
  return new EventCreationService(authorizationService, new FakeOrganizationRepository(organizations));
};

describe('EventCreationService.getCreatableOrganizations', () => {
  beforeEach(() => mockCallable.mockReset());

  test('returns organizations where the user has an event-creation role', async () => {
    const service = buildService(
      [buildOrganization({ id: 'org1', name: 'Royal Events' })],
      [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Planner })]
    );

    await expect(service.getCreatableOrganizations('user1')).resolves.toEqual([
      { organizationId: 'org1', name: 'Royal Events', role: OrganizationRole.Planner }
    ]);
  });

  test('excludes organizations where the user is staff', async () => {
    const service = buildService(
      [buildOrganization({ id: 'org1' })],
      [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Staff })]
    );

    await expect(service.getCreatableOrganizations('user1')).resolves.toEqual([]);
  });

  test('excludes inactive memberships', async () => {
    const service = buildService(
      [buildOrganization({ id: 'org1' })],
      [buildOrganizationMember('org1', 'user1', { status: MembershipStatus.Revoked })]
    );

    await expect(service.getCreatableOrganizations('user1')).resolves.toEqual([]);
  });

  test('returns an empty list for an unauthenticated caller', async () => {
    const service = buildService();

    await expect(service.getCreatableOrganizations('')).resolves.toEqual([]);
  });
});

describe('EventCreationService.createIndividualEvent', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the individual-event callable and returns the new event ID', async () => {
    mockCallable.mockResolvedValue({ data: { eventId: 'event1', membershipId: 'event1_user1' } });
    const service = buildService();

    const eventId = await service.createIndividualEvent(formInput);

    expect(eventId).toBe('event1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateIndividualEvent', formInput);
  });

  test('converts a callable failure into a friendly EventCreationError', async () => {
    mockCallable.mockRejectedValue({ code: 'invalid_timezone', message: 'Timezone "x" is not valid.' });
    const service = buildService();

    await expect(service.createIndividualEvent(formInput)).rejects.toMatchObject({
      code: 'invalid_timezone',
      friendlyMessage: 'Please select a valid timezone.'
    });
  });

  test('falls back to a generic message for an unrecognized error code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const service = buildService();

    const error = await service.createIndividualEvent(formInput).catch((e) => e);

    expect(error).toBeInstanceOf(EventCreationError);
    expect(error.friendlyMessage).toBe("We couldn't create your event right now.");
  });
});

describe('EventCreationService.createOrganizationEvent', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the organization-event callable with the organizationId included', async () => {
    mockCallable.mockResolvedValue({ data: { eventId: 'event1', membershipId: 'event1_user1' } });
    const service = buildService();

    const eventId = await service.createOrganizationEvent('org1', formInput);

    expect(eventId).toBe('event1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateOrganizationEvent', {
      organizationId: 'org1',
      ...formInput
    });
  });

  test('surfaces organization access denial as a friendly error, not a raw code', async () => {
    mockCallable.mockRejectedValue({ code: 'organization_role_not_allowed', message: 'role not allowed' });
    const service = buildService();

    await expect(service.createOrganizationEvent('org1', formInput)).rejects.toMatchObject({
      friendlyMessage: "Your role doesn't allow creating events for that organization."
    });
  });
});
