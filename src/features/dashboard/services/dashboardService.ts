import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { Organization } from '@/types/organization';
import { Event } from '@/types/event';
import { OrganizationMember, EventMember } from '@/types/membership';
import {
  DashboardData,
  DashboardEventSummary,
  DashboardOrganizationSummary
} from '@/features/dashboard/types/dashboard';
import { sortDashboardEvents } from '@/features/dashboard/services/eventSorting';
import { DashboardLoadError } from '@/lib/appError';

/**
 * Coordinates the reads behind the dashboard.
 *
 * Depends only on repository interfaces and the authorization service, so it is
 * unaware of Firestore. Infrastructure failures are converted into
 * DashboardLoadError before they reach the UI.
 *
 * Read shape (per load):
 *   1 query  — the user's organization memberships
 *   1 query  — the user's event memberships
 *   N gets   — organizations referenced by active memberships (parallel)
 *   M gets   — events referenced by active memberships (parallel)
 *
 * Memberships are listed once and reused; members of a resource are never
 * enumerated to build this view.
 */
export class DashboardService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventRepository: EventRepository
  ) {}

  async getDashboardData(userId: string, now: Date = new Date()): Promise<DashboardData> {
    if (!userId) {
      throw new DashboardLoadError();
    }

    try {
      const [organizationMemberships, eventMemberships] = await Promise.all([
        this.authorizationService.getUserOrganizations(userId),
        this.authorizationService.getUserEvents(userId)
      ]);

      const [organizations, events] = await Promise.all([
        this.loadOrganizations(organizationMemberships),
        this.loadEvents(eventMemberships)
      ]);

      const organizationNames = new Map(
        organizations.map(({ organization }) => [organization.id, organization.name])
      );

      return {
        organizations: organizations.map(toOrganizationSummary),
        events: sortDashboardEvents(
          events.map((entry) => toEventSummary(entry, organizationNames)),
          now
        )
      };
    } catch {
      throw new DashboardLoadError();
    }
  }

  /**
   * Resolves the organization document for each active membership. Memberships
   * pointing at a document that no longer exists are dropped.
   */
  private async loadOrganizations(
    memberships: readonly OrganizationMember[]
  ): Promise<{ organization: Organization; membership: OrganizationMember }[]> {
    const loaded = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await this.organizationRepository.getById(membership.organizationId);
        return organization ? { organization, membership } : null;
      })
    );

    return loaded.filter(isPresent);
  }

  /** Resolves the event document for each active membership. */
  private async loadEvents(
    memberships: readonly EventMember[]
  ): Promise<{ event: Event; membership: EventMember }[]> {
    const loaded = await Promise.all(
      memberships.map(async (membership) => {
        const event = await this.eventRepository.getById(membership.eventId);
        return event ? { event, membership } : null;
      })
    );

    return loaded.filter(isPresent);
  }
}

const isPresent = <T>(value: T | null): value is T => value !== null;

const toOrganizationSummary = ({
  organization,
  membership
}: {
  organization: Organization;
  membership: OrganizationMember;
}): DashboardOrganizationSummary => ({
  id: organization.id,
  name: organization.name,
  description: organization.description,
  role: membership.role
});

const toEventSummary = (
  { event, membership }: { event: Event; membership: EventMember },
  organizationNames: ReadonlyMap<string, string>
): DashboardEventSummary => {
  const organizationId = event.organizationId ?? null;

  return {
    id: event.id,
    name: event.name,
    type: event.type,
    startDate: event.startDate,
    endDate: event.endDate,
    status: event.status,
    role: membership.role,
    organizationId,
    // Only names the user is already entitled to see are resolved. Event
    // membership on its own never grants organization access.
    organizationName: organizationId ? (organizationNames.get(organizationId) ?? null) : null
  };
};
