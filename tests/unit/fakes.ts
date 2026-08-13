import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { RepositoryInfrastructureError } from '@/repositories/errors';
import { getEventMembershipId, getOrganizationMembershipId } from '@/repositories/membershipIds';
import { Organization } from '@/types/organization';
import { Event, EventStatus, EventType } from '@/types/event';
import {
  EventMember,
  EventRole,
  MembershipStatus,
  OrganizationMember,
  OrganizationRole
} from '@/types/membership';

/**
 * In-memory repositories implementing the same interfaces the Firebase
 * repositories implement. These let the dashboard and event-access services be
 * tested without Firestore.
 */

const now = '2026-01-01T00:00:00.000Z';

export const buildOrganization = (overrides: Partial<Organization> & { id: string }): Organization => ({
  name: 'Royal Events',
  slug: 'royal-events',
  contactEmail: 'hello@royalevents.com',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildEvent = (overrides: Partial<Event> & { id: string }): Event => ({
  name: 'Bhavin & Priya Wedding',
  type: EventType.Wedding,
  status: EventStatus.Draft,
  organizationId: null,
  createdBy: 'user1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildOrganizationMember = (
  organizationId: string,
  userId: string,
  overrides: Partial<OrganizationMember> = {}
): OrganizationMember => ({
  id: getOrganizationMembershipId(organizationId, userId),
  organizationId,
  userId,
  role: OrganizationRole.Owner,
  status: MembershipStatus.Active,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildEventMember = (
  eventId: string,
  userId: string,
  overrides: Partial<EventMember> = {}
): EventMember => ({
  id: getEventMembershipId(eventId, userId),
  eventId,
  userId,
  role: EventRole.Owner,
  status: MembershipStatus.Active,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const unsupported = (): never => {
  throw new Error('Not needed for these tests.');
};

export class FakeOrganizationRepository implements OrganizationRepository {
  failing = false;
  readonly reads: string[] = [];

  constructor(private readonly organizations: readonly Organization[] = []) {}

  async getById(organizationId: string): Promise<Organization | null> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to load organization.');
    }
    this.reads.push(organizationId);
    return this.organizations.find((o) => o.id === organizationId) ?? null;
  }

  create = unsupported;
  update = unsupported;
}

export class FakeEventRepository implements EventRepository {
  failing = false;
  readonly reads: string[] = [];

  constructor(private readonly events: readonly Event[] = []) {}

  async getById(eventId: string): Promise<Event | null> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to load event.');
    }
    this.reads.push(eventId);
    return this.events.find((e) => e.id === eventId) ?? null;
  }

  create = unsupported;
  update = unsupported;
}

export class FakeOrganizationMemberRepository implements OrganizationMemberRepository {
  failing = false;

  constructor(private readonly members: readonly OrganizationMember[] = []) {}

  async getById(memberId: string): Promise<OrganizationMember | null> {
    return this.members.find((m) => m.id === memberId) ?? null;
  }

  async listByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    return this.members.filter((m) => m.organizationId === organizationId);
  }

  async listByUser(userId: string): Promise<OrganizationMember[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list organization members.');
    }
    return this.members.filter((m) => m.userId === userId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeEventMemberRepository implements EventMemberRepository {
  failing = false;

  constructor(private readonly members: readonly EventMember[] = []) {}

  async getById(memberId: string): Promise<EventMember | null> {
    return this.members.find((m) => m.id === memberId) ?? null;
  }

  async listByEvent(eventId: string): Promise<EventMember[]> {
    return this.members.filter((m) => m.eventId === eventId);
  }

  async listByUser(userId: string): Promise<EventMember[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list event members.');
    }
    return this.members.filter((m) => m.userId === userId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}
