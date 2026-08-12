import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';

/**
 * Onboarding service for managing organization and event creation.
 * 
 * This service acts as a boundary between UI components and Firebase Cloud Functions.
 * It handles calling the trusted backend functions and mapping responses/errors.
 */

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CreateOrganizationOutput {
  organizationId: string;
  membershipId: string;
}

export interface CreateIndividualEventInput {
  name: string;
  type: string;
  description?: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
}

export interface CreateIndividualEventOutput {
  eventId: string;
  membershipId: string;
}

export type OnboardingError = {
  code: string;
  message: string;
  friendlyMessage: string;
};

/**
 * Map Cloud Function error codes to user-friendly messages.
 */
function mapErrorToFriendly(code: string, message: string): OnboardingError {
  const friendlyMap: Record<string, string> = {
    unauthenticated: 'You must be logged in to complete this action.',
    invalid_name: 'Please enter a valid name.',
    invalid_slug: 'The organization name contains invalid characters.',
    invalid_type: 'Please select a valid event type.',
    invalid_email: 'Please enter a valid email address.',
    invalid_phone: 'Please enter a valid phone number.',
    invalid_start_date: 'Please enter a valid start date.',
    invalid_end_date: 'The end date must not be before the start date.',
    invalid_timezone: 'Please select a valid timezone.',
    invalid_venue_name: 'Please enter a valid venue name.',
    invalid_venue_address: 'Please enter a valid venue address.',
    invalid_input: 'Some of your input is invalid. Please check and try again.',
    organization_slug_taken: 'That organization name is already taken. Please try another.',
    conflict: 'This resource already exists.',
    permission_denied: 'You do not have permission to perform this action.',
    internal_error: 'Something went wrong. Please try again.'
  };

  const friendlyMessage = friendlyMap[code] || 'An error occurred. Please try again.';

  return {
    code,
    message,
    friendlyMessage
  };
}

/**
 * Create an organization and set the authenticated user as the owner.
 * 
 * @param input Organization creation input
 * @returns Created organization ID and membership ID
 * @throws OnboardingError if the operation fails
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
  try {
    const createOrgFunction = httpsCallable<
      CreateOrganizationInput,
      CreateOrganizationOutput
    >(functions, 'onCreateOrganization');

    const result: HttpsCallableResult<CreateOrganizationOutput> = await createOrgFunction(input);
    return result.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const code = error.code || 'internal_error';
    const message = error.message || 'Unknown error';
    throw mapErrorToFriendly(code, message);
  }
}

/**
 * Create an individual event and set the authenticated user as the owner.
 * 
 * @param input Event creation input
 * @returns Created event ID and membership ID
 * @throws OnboardingError if the operation fails
 */
export async function createIndividualEvent(input: CreateIndividualEventInput): Promise<CreateIndividualEventOutput> {
  try {
    const createEventFunction = httpsCallable<
      CreateIndividualEventInput,
      CreateIndividualEventOutput
    >(functions, 'onCreateIndividualEvent');

    const result: HttpsCallableResult<CreateIndividualEventOutput> = await createEventFunction(input);
    return result.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const code = error.code || 'internal_error';
    const message = error.message || 'Unknown error';
    throw mapErrorToFriendly(code, message);
  }
}
