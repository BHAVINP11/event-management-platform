import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  createOrganization,
  validateCreateOrganizationInput
} from './onboarding/createOrganization';
import { handleCreateIndividualEvent } from './events/createIndividualEvent';
import { handleCreateOrganizationEvent } from './events/createOrganizationEvent';
import { ValidationError } from './validation';
import { mapErrorToCallableResponse } from './errorMapping';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Converts any error thrown by a callable's business logic into the
 * `HttpsError` sent to the client: a valid Firebase code (never the raw
 * application code), a user-safe message, and the original application code
 * preserved in `details.appCode` so the client can still key its own
 * messaging off of it. See `errorMapping.ts`.
 */
function toHttpsError(error: unknown): functions.https.HttpsError {
  const { firebaseCode, message, appCode } = mapErrorToCallableResponse(error);
  return new functions.https.HttpsError(firebaseCode, message, { appCode });
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
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - organization_slug_taken: Slug is already in use
 * - conflict: Organization already exists
 * - internal_error: Server error
 */
export const onCreateOrganization = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new ValidationError('unauthenticated', 'User must be authenticated.');
    }

    const validatedInput = validateCreateOrganizationInput(data);
    return await createOrganization(db, { uid: context.auth.uid }, validatedInput);
  } catch (error) {
    throw toHttpsError(error);
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
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - conflict: Event already exists
 * - internal_error: Server error
 */
export const onCreateIndividualEvent = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateIndividualEvent(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
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
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
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
    throw toHttpsError(error);
  }
});
