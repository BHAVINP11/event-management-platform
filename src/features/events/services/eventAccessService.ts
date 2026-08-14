import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { EventAccessResult } from '@/features/events/types/eventAccess';
import { EventLoadError } from '@/lib/appError';

/**
 * Loads a single event for the `/events/:eventId` route.
 *
 * Authorization is checked before the event is read, so a user cannot reach an
 * event by typing its URL. Firestore Security Rules independently enforce the
 * same boundary; this check exists to produce correct application behaviour,
 * not to be the boundary itself.
 */
export class EventAccessService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly organizationRepository: OrganizationRepository
  ) {}

  async loadEvent(userId: string, eventId: string): Promise<EventAccessResult> {
    if (!userId || !eventId) {
      return { status: 'denied' };
    }

    const access = await this.authorizationService.canAccessEvent(userId, eventId);

    if (!access.allowed) {
      // A read failure is not a permission decision — surface it as an error so
      // the user is not told they lack access when the data is simply missing.
      if (access.reason === 'infrastructure_error') {
        throw new EventLoadError();
      }
      return { status: 'denied' };
    }

    try {
      const [event, membership] = await Promise.all([
        this.eventRepository.getById(eventId),
        this.authorizationService.getEventMembership(userId, eventId)
      ]);

      if (!event) {
        return { status: 'notFound' };
      }

      if (!membership) {
        return { status: 'denied' };
      }

      const organizationId = event.organizationId ?? null;

      return {
        status: 'allowed',
        event: {
          id: event.id,
          name: event.name,
          type: event.type,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          timezone: event.timezone,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          status: event.status,
          role: membership.role,
          organizationId,
          organizationName: await this.resolveOrganizationName(userId, organizationId)
        }
      };
    } catch (error) {
      if (error instanceof EventLoadError) {
        throw error;
      }
      throw new EventLoadError();
    }
  }

  /**
   * Organization membership is separate from event membership: an event
   * carrying an organizationId does not entitle its members to organization
   * data, so access is checked before the name is read.
   */
  private async resolveOrganizationName(
    userId: string,
    organizationId: string | null
  ): Promise<string | null> {
    if (!organizationId) {
      return null;
    }

    const access = await this.authorizationService.canAccessOrganization(userId, organizationId);
    if (!access.allowed) {
      return null;
    }

    const organization = await this.organizationRepository.getById(organizationId);
    return organization?.name ?? null;
  }
}
