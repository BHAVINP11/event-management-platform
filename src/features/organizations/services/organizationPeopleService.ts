import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { OrganizationInvitationRepository } from '@/repositories/interfaces/organizationInvitationRepository';
import { UserRepository } from '@/repositories/interfaces/userRepository';
import { OrganizationMember } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import { OrganizationInvitation } from '@/types/organizationInvitation';
import {
  OrganizationInvitationSummary,
  OrganizationPeopleAccessResult,
  OrganizationPersonSummary
} from '@/features/organizations/types/organizationPeople';
import { OrganizationError } from '@/lib/appError';

/**
 * Loads the Members page for `/organizations/:organizationId` (Members tab).
 *
 * Access is checked the same way `OrganizationAccessService` checks it for
 * the Details tab — an active OrganizationMember is required before any
 * member/invitation data is read. Displaying a co-member's name requires
 * reading their `users/{userId}` profile, which Firestore rules restrict
 * to the profile's own owner; rather than widen that boundary, only the
 * current user's own row resolves a name, and other rows fall back to a
 * generic label — mirrors `EventPeopleService` exactly.
 */
export class OrganizationPeopleService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    private readonly organizationInvitationRepository: OrganizationInvitationRepository,
    private readonly userRepository: UserRepository
  ) {}

  async listPeople(userId: string, organizationId: string): Promise<OrganizationPeopleAccessResult> {
    if (!userId || !organizationId) {
      return { status: 'denied' };
    }

    const access = await this.authorizationService.canAccessOrganization(userId, organizationId);

    if (!access.allowed) {
      if (access.reason === 'infrastructure_error') {
        throw new OrganizationError('internal_error', "We couldn't load this organization's members right now.");
      }
      return { status: 'denied' };
    }

    try {
      const organization = await this.organizationRepository.getById(organizationId);
      if (!organization) {
        return { status: 'notFound' };
      }

      const [members, invitations, membership] = await Promise.all([
        this.organizationMemberRepository.listByOrganization(organizationId),
        this.organizationInvitationRepository.listByOrganization(organizationId),
        this.authorizationService.getOrganizationMembership(userId, organizationId)
      ]);

      // Removed members are marked `revoked` (see `removeOrganizationMember`),
      // not deleted — still returned here for the same reason
      // `EventPeopleService` returns revoked event members: a future
      // consumer resolving a historical reference should not have to
      // special-case this. The Members page itself filters this list down
      // to active members for display; that's a UI concern, not a
      // data-loading one.
      const memberSummaries = await Promise.all(members.map((member) => this.toPersonSummary(member, userId)));

      const pendingInvitations = invitations
        .filter((invitation) => invitation.status === InvitationStatus.Pending)
        .map(toInvitationSummary);

      return {
        status: 'allowed',
        data: {
          members: memberSummaries,
          invitations: pendingInvitations,
          canManage: Boolean(membership && this.authorizationService.canManageOrganization(membership))
        }
      };
    } catch {
      throw new OrganizationError('internal_error', "We couldn't load this organization's members right now.");
    }
  }

  private async toPersonSummary(member: OrganizationMember, currentUserId: string): Promise<OrganizationPersonSummary> {
    let label: string | null = null;

    if (member.userId === currentUserId) {
      try {
        const user = await this.userRepository.getById(member.userId);
        label = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : null;
      } catch {
        label = null;
      }
    }

    return {
      id: member.id,
      userId: member.userId,
      label,
      role: member.role,
      status: member.status,
      joinedAt: member.createdAt
    };
  }
}

const toInvitationSummary = (invitation: OrganizationInvitation): OrganizationInvitationSummary => ({
  id: invitation.id,
  invitedEmail: invitation.invitedEmail,
  role: invitation.role,
  status: invitation.status,
  createdAt: invitation.createdAt,
  expiresAt: invitation.expiresAt
});
