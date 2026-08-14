import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { AuthorizationResult } from '@/features/auth/types/authorization';
import { EventRole, MembershipStatus, OrganizationRole } from '@/types/membership';
import { OrganizationMember, EventMember } from '@/types/membership';

/**
 * Organization roles that are expected to manage events on behalf of the
 * organization. Used only to decide whether event-creation entry points are
 * offered in the UI; the trusted backend remains the authority on creation.
 */
const eventCreationOrganizationRoles: readonly OrganizationRole[] = [
  OrganizationRole.Owner,
  OrganizationRole.Admin,
  OrganizationRole.Planner
];

/**
 * Event roles that are expected to invite people to an event. Used only to
 * decide whether the "Invite Person" entry point is offered in the UI; the
 * trusted createInvitation Cloud Function remains the authority.
 */
const eventInvitationRoles: readonly EventRole[] = [EventRole.Owner, EventRole.Planner];

export class AuthorizationService {
  constructor(
    private organizationMemberRepository: OrganizationMemberRepository,
    private eventMemberRepository: EventMemberRepository
  ) {}

  async canAccessOrganization(userId: string, organizationId: string): Promise<AuthorizationResult> {
    if (!userId) {
      return { allowed: false, reason: 'unauthenticated' };
    }

    try {
      const memberships = await this.organizationMemberRepository.listByUser(userId);
      const membership = memberships.find((m) => m.organizationId === organizationId);

      if (!membership) {
        return { allowed: false, reason: 'membership_not_found' };
      }

      if (membership.status !== MembershipStatus.Active) {
        return { allowed: false, reason: 'membership_inactive' };
      }

      return { allowed: true };
    } catch {
      return { allowed: false, reason: 'infrastructure_error' };
    }
  }

  async canAccessEvent(userId: string, eventId: string): Promise<AuthorizationResult> {
    if (!userId) {
      return { allowed: false, reason: 'unauthenticated' };
    }

    try {
      const memberships = await this.eventMemberRepository.listByUser(userId);
      const membership = memberships.find((m) => m.eventId === eventId);

      if (!membership) {
        return { allowed: false, reason: 'membership_not_found' };
      }

      if (membership.status !== MembershipStatus.Active) {
        return { allowed: false, reason: 'membership_inactive' };
      }

      return { allowed: true };
    } catch {
      return { allowed: false, reason: 'infrastructure_error' };
    }
  }

  async getOrganizationMembership(userId: string, organizationId: string): Promise<OrganizationMember | null> {
    if (!userId) {
      return null;
    }

    try {
      const memberships = await this.organizationMemberRepository.listByUser(userId);
      return memberships.find((m) => m.organizationId === organizationId) || null;
    } catch {
      return null;
    }
  }

  async getEventMembership(userId: string, eventId: string): Promise<EventMember | null> {
    if (!userId) {
      return null;
    }

    try {
      const memberships = await this.eventMemberRepository.listByUser(userId);
      return memberships.find((m) => m.eventId === eventId) || null;
    } catch {
      return null;
    }
  }

  /**
   * Active organization memberships for the user.
   *
   * Repository failures propagate: callers must distinguish "no access" from
   * "could not be determined" rather than rendering an empty result.
   */
  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    if (!userId) {
      return [];
    }

    const memberships = await this.organizationMemberRepository.listByUser(userId);
    return memberships.filter((m) => m.status === MembershipStatus.Active);
  }

  /** Active event memberships for the user. Repository failures propagate. */
  async getUserEvents(userId: string): Promise<EventMember[]> {
    if (!userId) {
      return [];
    }

    const memberships = await this.eventMemberRepository.listByUser(userId);
    return memberships.filter((m) => m.status === MembershipStatus.Active);
  }

  /**
   * Whether an organization membership implies the user is expected to create
   * events for that organization. Pure so callers can reuse memberships they
   * have already loaded instead of issuing another read.
   */
  canCreateEventInOrganization(membership: OrganizationMember): boolean {
    return (
      membership.status === MembershipStatus.Active &&
      eventCreationOrganizationRoles.includes(membership.role)
    );
  }

  /**
   * Whether an event membership implies the user may invite people to that
   * event. Pure so callers can reuse a membership they have already loaded.
   */
  canInviteToEvent(membership: EventMember): boolean {
    return membership.status === MembershipStatus.Active && eventInvitationRoles.includes(membership.role);
  }
}
