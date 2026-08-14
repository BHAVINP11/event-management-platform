import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { InvitationRepository } from '@/repositories/interfaces/invitationRepository';
import { UserRepository } from '@/repositories/interfaces/userRepository';
import { EventMember } from '@/types/membership';
import { Invitation, InvitationStatus } from '@/types/invitation';
import {
  EventInvitationSummary,
  EventPeopleAccessResult,
  EventPersonSummary
} from '@/features/events/types/people';
import { EventLoadError } from '@/lib/appError';

/**
 * Loads the People page for `/events/:eventId/people`.
 *
 * Access is checked the same way EventAccessService checks it for the
 * workspace Overview — an active EventMember is required before any
 * member/invitation data is read. Displaying a co-member's name requires
 * reading their `users/{userId}` profile, which Firestore rules restrict to
 * the profile's own owner; rather than widen that boundary, only the
 * current user's own row resolves a name, and other rows fall back to a
 * generic label. Pending invitations always show their invitedEmail, since
 * that lives on the Invitation document itself.
 */
export class EventPeopleService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly eventMemberRepository: EventMemberRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly userRepository: UserRepository
  ) {}

  async listPeople(userId: string, eventId: string): Promise<EventPeopleAccessResult> {
    if (!userId || !eventId) {
      return { status: 'denied' };
    }

    const access = await this.authorizationService.canAccessEvent(userId, eventId);

    if (!access.allowed) {
      if (access.reason === 'infrastructure_error') {
        throw new EventLoadError();
      }
      return { status: 'denied' };
    }

    try {
      const event = await this.eventRepository.getById(eventId);
      if (!event) {
        return { status: 'notFound' };
      }

      const [members, invitations, membership] = await Promise.all([
        this.eventMemberRepository.listByEvent(eventId),
        this.invitationRepository.listByEvent(eventId),
        this.authorizationService.getEventMembership(userId, eventId)
      ]);

      const memberSummaries = await Promise.all(members.map((member) => this.toPersonSummary(member, userId)));

      const pendingInvitations = invitations
        .filter((invitation) => invitation.status === InvitationStatus.Pending)
        .map(toInvitationSummary);

      return {
        status: 'allowed',
        data: {
          members: memberSummaries,
          invitations: pendingInvitations,
          canInvite: Boolean(membership && this.authorizationService.canInviteToEvent(membership))
        }
      };
    } catch {
      throw new EventLoadError();
    }
  }

  private async toPersonSummary(member: EventMember, currentUserId: string): Promise<EventPersonSummary> {
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
      side: member.side ?? null,
      status: member.status
    };
  }
}

const toInvitationSummary = (invitation: Invitation): EventInvitationSummary => ({
  id: invitation.id,
  invitedEmail: invitation.invitedEmail,
  role: invitation.role,
  side: invitation.side ?? null,
  status: invitation.status
});
