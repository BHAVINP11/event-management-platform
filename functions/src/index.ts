import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  createOrganization,
  validateCreateOrganizationInput
} from './onboarding/createOrganization';
import { handleCreateIndividualEvent } from './events/createIndividualEvent';
import { handleCreateOrganizationEvent } from './events/createOrganizationEvent';
import { ValidationError } from './validation';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Application-level error response.
 */
interface ErrorResponse {
  code: string;
  message: string;
}

/**
 * Map validation and application errors to callable function error codes.
 */
function mapErrorToResponse(error: unknown): ErrorResponse {
  if (error instanceof ValidationError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof Error) {
    // Firestore error
    if (error.message.includes('ALREADY_EXISTS') || error.message.includes('already exists')) {
      return {
        code: 'conflict',
        message: 'This resource already exists.'
      };
    }

    if (error.message.includes('PERMISSION_DENIED')) {
      return {
        code: 'permission_denied',
        message: 'You do not have permission to perform this action.'
      };
    }

    return {
      code: 'internal_error',
      message: 'An unexpected error occurred. Please try again.'
    };
  }

  return {
    code: 'internal_error',
    message: 'An unexpected error occurred. Please try again.'
  };
}

/**
 * Callable Cloud Function: createOrganization
 *
 * Creates an organization and sets the caller as the owner.
 *
 * Input:
 * {
 *   name: string,
 *   slug: string,
 *   description?: string,
 *   contactEmail?: string,
 *   contactPhone?: string
 * }
 *
 * Output:
 * {
 *   organizationId: string,
 *   membershipId: string
 * }
 *
 * Errors:
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - organization_slug_taken: Slug is already in use
 * - conflict: Organization already exists
 * - internal_error: Server error
 */
export const onCreateOrganization = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    // Validate input
    const validatedInput = validateCreateOrganizationInput(data);

    // Call business logic with auth context
    const result = await createOrganization(db, { uid: context.auth.uid }, validatedInput);

    return result;
  } catch (error) {
    const errorResponse = mapErrorToResponse(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new functions.https.HttpsError(
      errorResponse.code as any,
      errorResponse.message
    );
  }
});

/**
 * Callable Cloud Function: createIndividualEvent
 *
 * Creates an individual event (organizationId = null) and sets the caller as
 * the owner. Used both by individual onboarding and by the post-onboarding
 * "Create Event" flow — there is only one way to create an individual event.
 *
 * Input:
 * {
 *   name: string,
 *   type: string (EventType),
 *   description?: string,
 *   startDate: string (ISO 8601),
 *   endDate?: string (ISO 8601),
 *   timezone: string,
 *   venueName?: string,
 *   venueAddress?: string
 * }
 *
 * Output:
 * {
 *   eventId: string,
 *   membershipId: string
 * }
 *
 * Errors:
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - conflict: Event already exists
 * - internal_error: Server error
 */
export const onCreateIndividualEvent = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateIndividualEvent(db, data, context);
  } catch (error) {
    const errorResponse = mapErrorToResponse(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new functions.https.HttpsError(
      errorResponse.code as any,
      errorResponse.message
    );
  }
});

/**
 * Callable Cloud Function: createOrganizationEvent
 *
 * Creates an event owned by an organization (organizationId = requested
 * organization) and sets the caller as the event owner. The caller must have
 * an active organization membership with role owner, admin, or planner —
 * verified against the stored membership document, never trusted from the
 * client.
 *
 * Input:
 * {
 *   organizationId: string,
 *   name: string,
 *   type: string (EventType),
 *   description?: string,
 *   startDate: string (ISO 8601),
 *   endDate?: string (ISO 8601),
 *   timezone: string,
 *   venueName?: string,
 *   venueAddress?: string
 * }
 *
 * Output:
 * {
 *   eventId: string,
 *   membershipId: string
 * }
 *
 * Errors:
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - organization_not_found: Organization does not exist
 * - organization_access_denied: Caller has no active membership in the organization
 * - organization_role_not_allowed: Caller's role cannot create events
 * - internal_error: Server error
 */
export const onCreateOrganizationEvent = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateOrganizationEvent(db, data, context);
  } catch (error) {
    const errorResponse = mapErrorToResponse(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new functions.https.HttpsError(
      errorResponse.code as any,
      errorResponse.message
    );
  }
});
