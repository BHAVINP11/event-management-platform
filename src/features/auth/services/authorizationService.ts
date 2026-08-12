import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { AuthorizationResult } from '@/features/auth/types/authorization';
import { MembershipStatus } from '@/types/membership';
import { OrganizationMember } from '@/types/organizationMember';
import { EventMember } from '@/types/eventMember';

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

  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    if (!userId) {
      return [];
    }

    try {
      const memberships = await this.organizationMemberRepository.listByUser(userId);
      return memberships.filter((m) => m.status === MembershipStatus.Active);
    } catch {
      return [];
    }
  }

  async getUserEvents(userId: string): Promise<EventMember[]> {
    if (!userId) {
      return [];
    }

    try {
      const memberships = await this.eventMemberRepository.listByUser(userId);
      return memberships.filter((m) => m.status === MembershipStatus.Active);
    } catch {
      return [];
    }
  }
}

