import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import {
  EventCreationFormInput,
  EventCreationOrganizationOption
} from '@/features/events/types/eventCreation';
import { EventCreationError } from '@/lib/appError';

interface CreateEventFunctionOutput {
  eventId: string;
  membershipId: string;
}

type CreateOrganizationEventFunctionInput = EventCreationFormInput & { organizationId: string };

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to create an event.',
  invalid_input: "Some of the event details don't look right. Please check and try again.",
  invalid_name: 'Please enter a valid event name.',
  invalid_type: 'Please select a valid event type.',
  invalid_start_date: 'Please enter a valid start date.',
  invalid_end_date: 'The end date cannot be before the start date.',
  invalid_timezone: 'Please select a valid timezone.',
  invalid_venue_name: 'Please enter a valid venue name.',
  invalid_venue_address: 'Please enter a valid venue address.',
  invalid_organization_id: 'Please choose an organization.',
  organization_not_found: "We couldn't find that organization.",
  organization_access_denied: "You don't have access to that organization.",
  organization_role_not_allowed: "Your role doesn't allow creating events for that organization.",
  conflict: 'This event already exists.',
  permission_denied: 'You do not have permission to perform this action.',
  internal_error: "We couldn't create your event right now."
};

const toEventCreationError = (error: unknown): EventCreationError => {
  const code = (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new EventCreationError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

const isPresent = <T>(value: T | null): value is T => value !== null;

/**
 * Creates events through the trusted Cloud Functions and resolves which
 * organizations the current user may create events for.
 *
 * Creation itself never touches a repository: the callable functions are the
 * only path from the browser to a written Event/EventMember. Reading which
 * organizations to offer as a creation target is ordinary, non-privileged
 * data access and goes through the same repository interfaces the rest of
 * the app uses — the Cloud Function independently re-verifies access before
 * writing anything, so this list is a convenience, not an authority.
 */
export class EventCreationService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly organizationRepository: OrganizationRepository
  ) {}

  async getCreatableOrganizations(userId: string): Promise<EventCreationOrganizationOption[]> {
    if (!userId) {
      return [];
    }

    try {
      const memberships = await this.authorizationService.getUserOrganizations(userId);
      const creatable = memberships.filter((membership) =>
        this.authorizationService.canCreateEventInOrganization(membership)
      );

      const resolved = await Promise.all(
        creatable.map(async (membership) => {
          const organization = await this.organizationRepository.getById(membership.organizationId);
          return organization
            ? { organizationId: organization.id, name: organization.name, role: membership.role }
            : null;
        })
      );

      return resolved.filter(isPresent);
    } catch {
      throw new EventCreationError('internal_error', friendlyMessages.internal_error);
    }
  }

  async createIndividualEvent(input: EventCreationFormInput): Promise<string> {
    try {
      const callable = httpsCallable<EventCreationFormInput, CreateEventFunctionOutput>(
        functions,
        'onCreateIndividualEvent'
      );
      const result: HttpsCallableResult<CreateEventFunctionOutput> = await callable(input);
      return result.data.eventId;
    } catch (error) {
      throw toEventCreationError(error);
    }
  }

  async createOrganizationEvent(organizationId: string, input: EventCreationFormInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateOrganizationEventFunctionInput, CreateEventFunctionOutput>(
        functions,
        'onCreateOrganizationEvent'
      );
      const result: HttpsCallableResult<CreateEventFunctionOutput> = await callable({
        organizationId,
        ...input
      });
      return result.data.eventId;
    } catch (error) {
      throw toEventCreationError(error);
    }
  }
}
