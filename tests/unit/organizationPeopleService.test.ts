import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { OrganizationPeopleService } from '@/features/organizations/services/organizationPeopleService';
import { OrganizationError } from '@/lib/appError';
import { MembershipStatus, OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import {
  buildOrganization,
  buildOrganizationInvitation,
  buildOrganizationMember,
  buildUser,
  FakeEventMemberRepository,
  FakeOrganizationInvitationRepository,
  FakeOrganizationMemberRepository,
  FakeOrganizationRepository,
  FakeUserRepository
} from './fakes';

interface WorldOptions {
  organizations?: ReturnType<typeof buildOrganization>[];
  organizationMembers?: ReturnType<typeof buildOrganizationMember>[];
  invitations?: ReturnType<typeof buildOrganizationInvitation>[];
  users?: ReturnType<typeof buildUser>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const organizationRepository = new FakeOrganizationRepository(options.organizations ?? []);
  const organizationMemberRepository = new FakeOrganizationMemberRepository(options.organizationMembers ?? []);
  const organizationInvitationRepository = new FakeOrganizationInvitationRepository(options.invitations ?? []);
  const userRepository = new FakeUserRepository(options.users ?? []);

  const authorizationService = new AuthorizationService(organizationMemberRepository, new FakeEventMemberRepository());

  return {
    organizationMemberRepository,
    organizationInvitationRepository,
    userRepository,
    service: new OrganizationPeopleService(
      authorizationService,
      organizationRepository,
      organizationMemberRepository,
      organizationInvitationRepository,
      userRepository
    )
  };
};

describe('OrganizationPeopleService.listPeople', () => {
  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })]
    });

    await expect(service.listPeople('user1', 'org1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the organization document is missing', async () => {
    const { service } = buildWorld({
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });

    await expect(service.listPeople('user1', 'org1')).resolves.toEqual({ status: 'notFound' });
  });

  test('lists members and pending invitations only', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Owner }),
        buildOrganizationMember('org1', 'user2', { role: OrganizationRole.Planner })
      ],
      invitations: [
        buildOrganizationInvitation({ id: 'inv1', organizationId: 'org1', invitedEmail: 'meena@example.com', status: InvitationStatus.Pending }),
        buildOrganizationInvitation({ id: 'inv2', organizationId: 'org1', invitedEmail: 'old@example.com', status: InvitationStatus.Accepted }),
        buildOrganizationInvitation({ id: 'inv3', organizationId: 'org1', invitedEmail: 'gone@example.com', status: InvitationStatus.Cancelled })
      ]
    });

    const result = await service.listPeople('user1', 'org1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.members).toHaveLength(2);
    expect(result.data.invitations).toEqual([
      expect.objectContaining({ invitedEmail: 'meena@example.com', status: InvitationStatus.Pending })
    ]);
  });

  test("resolves the current user's own name but not a co-member's", async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1'), buildOrganizationMember('org1', 'user2')],
      users: [buildUser({ id: 'user1', firstName: 'Bhavin', lastName: 'Patel' })]
    });

    const result = await service.listPeople('user1', 'org1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    const self = result.data.members.find((m) => m.userId === 'user1');
    const other = result.data.members.find((m) => m.userId === 'user2');
    expect(self?.label).toBe('Bhavin Patel');
    expect(other?.label).toBeNull();
  });

  test('still includes a revoked (removed) member', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Owner }),
        buildOrganizationMember('org1', 'user2', { status: MembershipStatus.Revoked })
      ]
    });

    const result = await service.listPeople('user1', 'org1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.members.map((m) => m.userId).sort()).toEqual(['user1', 'user2']);
  });

  test('offers canManage to an owner', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Owner })]
    });

    const result = await service.listPeople('user1', 'org1');
    expect(result.status === 'allowed' && result.data.canManage).toBe(true);
  });

  test('offers canManage to an admin', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Admin })]
    });

    const result = await service.listPeople('user1', 'org1');
    expect(result.status === 'allowed' && result.data.canManage).toBe(true);
  });

  test('does not offer canManage to a planner/staff member', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Planner })]
    });

    const result = await service.listPeople('user1', 'org1');
    expect(result.status === 'allowed' && result.data.canManage).toBe(false);
  });

  test('an inactive membership is denied entirely, not merely offered without canManage', async () => {
    const { service } = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [
        buildOrganizationMember('org1', 'user1', { role: OrganizationRole.Owner, status: MembershipStatus.Inactive })
      ]
    });

    await expect(service.listPeople('user1', 'org1')).resolves.toEqual({ status: 'denied' });
  });

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      organizations: [buildOrganization({ id: 'org1' })],
      organizationMembers: [buildOrganizationMember('org1', 'user1')]
    });
    world.organizationInvitationRepository.failing = true;

    await expect(world.service.listPeople('user1', 'org1')).rejects.toBeInstanceOf(OrganizationError);
  });
});
