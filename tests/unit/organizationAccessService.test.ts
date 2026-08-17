import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { OrganizationAccessService } from '@/features/organizations/services/organizationAccessService';
import { OrganizationError } from '@/lib/appError';
import { MembershipStatus, OrganizationRole } from '@/types/membership';
import {
  buildOrganization,
  buildOrganizationMember,
  FakeEventMemberRepository,
  FakeOrganizationMemberRepository,
  FakeOrganizationRepository
} from './fakes';

interface WorldOptions {
  organizations?: ReturnType<typeof buildOrganization>[];
  organizationMembers?: ReturnType<typeof buildOrganizationMember>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const organizationRepository = new FakeOrganizationRepository(options.organizations ?? []);
  const organizationMemberRepository = new FakeOrganizationMemberRepository(options.organizationMembers ?? []);

  const authorizationService = new AuthorizationService(organizationMemberRepository, new FakeEventMemberRepository());

  return {
    organizationRepository,
    organizationMemberRepository,
    service: new OrganizationAccessService(authorizationService, organizationRepository)
  };
};

describe('OrganizationAccessService.loadOrganization', () => {
  test('an authorized user can open an accessible organization', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1', name: 'Royal Events' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Planner })]
    });

    const result = await service.loadOrganization('user1', 'org1');

    expect(result).toMatchObject({
      status: 'allowed',
      organization: { id: 'org1', name: 'Royal Events', role: OrganizationRole.Planner }
    });
  });

  test('a user with no membership cannot open the organization, even with a direct URL', async () => {
    const { service, organizationRepository } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user2')]
    });

    const result = await service.loadOrganization('user1', 'org1');

    expect(result).toEqual({ status: 'denied' });
    // The organization document is never read for an unauthorized user.
    expect(organizationRepository.reads).toEqual([]);
  });

  test('a user with an inactive membership cannot open the organization', async () => {
    const { service, organizationRepository } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { status: MembershipStatus.Revoked })]
    });

    const result = await service.loadOrganization('user1', 'org1');

    expect(result).toEqual({ status: 'denied' });
    expect(organizationRepository.reads).toEqual([]);
  });

  test('an unauthenticated caller is denied', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });

    await expect(service.loadOrganization('', 'org1')).resolves.toEqual({ status: 'denied' });
  });

  test('a missing organization shows the not-found state', async () => {
    const { service } = buildWorld({
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });

    await expect(service.loadOrganization('user1', 'org1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an owner can manage the organization', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Owner })]
    });

    const result = await service.loadOrganization('user1', 'org1');

    expect(result).toMatchObject({ status: 'allowed', organization: { canManage: true } });
  });

  test('an admin can manage the organization', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Admin })]
    });

    const result = await service.loadOrganization('user1', 'org1');

    expect(result).toMatchObject({ status: 'allowed', organization: { canManage: true } });
  });

  test.each([OrganizationRole.Planner, OrganizationRole.Staff])(
    'a %s member cannot manage the organization',
    async (role) => {
      const { service } = buildWorld({
        organizations: [buildOrganization({ id: 'org1' })],
        organizationMembers: [buildOrganizationMember('org1', 'user1', { role })]
      });

      const result = await service.loadOrganization('user1', 'org1');

      expect(result).toMatchObject({ status: 'allowed', organization: { canManage: false } });
    }
  );

  test('a read failure surfaces an application error rather than an access denial', async () => {
    const world = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });
    world.organizationMemberRepository.failing = true;

    await expect(world.service.loadOrganization('user1', 'org1')).rejects.toBeInstanceOf(OrganizationError);
  });

  test('a failure loading the organization document is reported as a friendly error', async () => {
    const world = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });
    world.organizationRepository.failing = true;

    await expect(world.service.loadOrganization('user1', 'org1')).rejects.toMatchObject({
      friendlyMessage: "We couldn't load this organization right now."
    });
  });
});

describe('OrganizationAccessService.listMyOrganizations', () => {
  test('lists the organizations the user actively belongs to', async () => {
    const { service } = buildWorld({
      organizations: [
        buildOrganization({ id: 'org1', name: 'Royal Events' }),
        buildOrganization({ id: 'org2', name: 'Dream Weddings' })
      ],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Owner }),
        buildOrganizationMember('org2', 'user1', { role: OrganizationRole.Planner })
      ]
    });

    const result = await service.listMyOrganizations('user1');

    expect(result).toEqual([
      { organizationId: 'org1', name: 'Royal Events', role: OrganizationRole.Owner },
      { organizationId: 'org2', name: 'Dream Weddings', role: OrganizationRole.Planner }
    ]);
  });

  test('returns an empty list for an unauthenticated caller', async () => {
    const { service } = buildWorld();

    await expect(service.listMyOrganizations('')).resolves.toEqual([]);
  });

  test('drops a membership whose organization document no longer exists', async () => {
    const { service } = buildWorld({
      organizations: [],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });

    await expect(service.listMyOrganizations('user1')).resolves.toEqual([]);
  });

  test('surfaces a repository failure as a friendly error', async () => {
    const world = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });
    world.organizationMemberRepository.failing = true;

    await expect(world.service.listMyOrganizations('user1')).rejects.toBeInstanceOf(OrganizationError);
  });
});
