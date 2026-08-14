import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  createOrganization,
  validateCreateOrganizationInput
} from './onboarding/createOrganization';
import { handleCreateIndividualEvent } from './events/createIndividualEvent';
import { handleCreateOrganizationEvent } from './events/createOrganizationEvent';
import { handleCreateInvitation } from './invitations/createInvitation';
import { handleAcceptInvitation } from './invitations/acceptInvitation';
import { handleGetInvitationPreview } from './invitations/getInvitationPreview';
import { handleCreateGuest } from './guests/createGuest';
import { handleUpdateGuest } from './guests/updateGuest';
import { handleDeleteGuest } from './guests/deleteGuest';
import { handleCreateFunction } from './ceremonies/createFunction';
import { handleUpdateFunction } from './ceremonies/updateFunction';
import { handleDeleteFunction } from './ceremonies/deleteFunction';
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

/**
 * Callable Cloud Function: createInvitation
 *
 * Invites a person to an event. The caller must have an active EventMember
 * with role owner or planner — verified against the stored membership
 * document. Creates a pending Invitation only; no EventMember is created
 * until the invitation is accepted.
 *
 * Input:
 * {
 *   eventId: string,
 *   invitedEmail: string,
 *   role: string ('couple' | 'family' | 'planner' | 'staff' | 'viewer'),
 *   side?: string ('bride' | 'groom', only for role couple/family)
 * }
 *
 * Output:
 * {
 *   invitationId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot invite people
 * - invitation_already_pending: A pending invitation already exists for this event + email
 * - internal_error: Server error
 */
export const onCreateInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: acceptInvitation
 *
 * Accepts a pending invitation and creates the invitee's EventMember
 * (deterministic ID `eventMembers/{eventId}_{userId}`), copying role, side,
 * and invitedBy from the invitation. The invitation is marked accepted in
 * the same atomic write.
 *
 * Input:
 * {
 *   invitationId: string
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
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation does not exist
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - invitation_expired: Invitation's expiresAt has passed
 * - invitation_email_mismatch: Caller's authenticated email does not match invitedEmail
 * - internal_error: Server error
 */
export const onAcceptInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleAcceptInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: getInvitationPreview
 *
 * Read-only projection for the `/invitations/:invitationId` acceptance page:
 * the event's name plus the invitation's own fields. Gated by the same
 * email-match check as acceptance, and does not require event membership —
 * that would defeat the point, since the invitee doesn't have it yet.
 *
 * Input:
 * {
 *   invitationId: string
 * }
 *
 * Output:
 * {
 *   eventName: string,
 *   invitedEmail: string,
 *   role: string,
 *   side: string | null
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation (or its event) does not exist
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - invitation_expired: Invitation's expiresAt has passed
 * - invitation_email_mismatch: Caller's authenticated email does not match invitedEmail
 * - internal_error: Server error
 */
export const onGetInvitationPreview = functions.https.onCall(async (data, context) => {
  try {
    return await handleGetInvitationPreview(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: createGuest
 *
 * Adds a guest to an event. The caller must have an active EventMember with
 * role owner or planner. `id`, `eventId` (from the request), `createdBy`,
 * and the timestamps are never trusted from the client beyond the
 * requested `eventId`, which is independently verified.
 *
 * Input:
 * {
 *   eventId: string,
 *   name: string,
 *   phone?: string,
 *   email?: string,
 *   side: string ('bride' | 'groom' | 'both'),
 *   relation?: string,
 *   notes?: string,
 *   status?: string ('pending' | 'invited' | 'confirmed' | 'declined', default 'pending')
 * }
 *
 * Output:
 * {
 *   guestId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage guests
 * - internal_error: Server error
 */
export const onCreateGuest = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateGuest(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateGuest
 *
 * Edits a guest's fields. Authority is verified against the guest's
 * *stored* eventId, never one the client could supply, so a client cannot
 * retarget an edit at a different event's guest. `id`, `eventId`,
 * `createdBy`, and `createdAt` are carried over from the existing document.
 *
 * Input:
 * {
 *   guestId: string,
 *   name: string,
 *   phone?: string,
 *   email?: string,
 *   side: string,
 *   relation?: string,
 *   notes?: string,
 *   status?: string
 * }
 *
 * Output:
 * {
 *   guestId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - guest_not_found: Guest does not exist
 * - event_access_denied: Caller has no active membership in the guest's event
 * - event_role_not_allowed: Caller's role cannot manage guests
 * - internal_error: Server error
 */
export const onUpdateGuest = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateGuest(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: deleteGuest
 *
 * Removes a guest. Authority is verified against the guest's *stored*
 * eventId, exactly like updateGuest.
 *
 * Input:
 * {
 *   guestId: string
 * }
 *
 * Output:
 * {
 *   guestId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_guest_id: Input validation error
 * - guest_not_found: Guest does not exist
 * - event_access_denied: Caller has no active membership in the guest's event
 * - event_role_not_allowed: Caller's role cannot manage guests
 * - internal_error: Server error
 */
export const onDeleteGuest = functions.https.onCall(async (data, context) => {
  try {
    return await handleDeleteGuest(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: createFunction
 *
 * Adds a function/ceremony (e.g. Mehndi, Haldi, Sangeet, Wedding,
 * Reception) to an event. The caller must have an active EventMember with
 * role owner or planner. `id`, `eventId` (from the request), `createdBy`,
 * and the timestamps are never trusted from the client beyond the
 * requested `eventId`, which is independently verified.
 *
 * Input:
 * {
 *   eventId: string,
 *   name: string,
 *   description?: string,
 *   date?: string,
 *   startTime?: string ("HH:MM"),
 *   endTime?: string ("HH:MM"),
 *   venue?: string,
 *   notes?: string,
 *   status?: string ('planned' | 'confirmed' | 'completed' | 'cancelled', default 'planned')
 * }
 *
 * Output:
 * {
 *   functionId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_time_range)
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage functions
 * - internal_error: Server error
 */
export const onCreateFunction = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateFunction(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateFunction
 *
 * Edits a function/ceremony's fields. Authority is verified against the
 * function's *stored* eventId, never one the client could supply, so a
 * client cannot retarget an edit at a different event's function. `id`,
 * `eventId`, `createdBy`, and `createdAt` are carried over from the
 * existing document.
 *
 * Input:
 * {
 *   functionId: string,
 *   name: string,
 *   description?: string,
 *   date?: string,
 *   startTime?: string,
 *   endTime?: string,
 *   venue?: string,
 *   notes?: string,
 *   status?: string
 * }
 *
 * Output:
 * {
 *   functionId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_time_range)
 * - function_not_found: Function does not exist
 * - event_access_denied: Caller has no active membership in the function's event
 * - event_role_not_allowed: Caller's role cannot manage functions
 * - internal_error: Server error
 */
export const onUpdateFunction = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateFunction(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: deleteFunction
 *
 * Removes a function/ceremony. Authority is verified against the
 * function's *stored* eventId, exactly like updateFunction.
 *
 * Input:
 * {
 *   functionId: string
 * }
 *
 * Output:
 * {
 *   functionId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_function_id: Input validation error
 * - function_not_found: Function does not exist
 * - event_access_denied: Caller has no active membership in the function's event
 * - event_role_not_allowed: Caller's role cannot manage functions
 * - internal_error: Server error
 */
export const onDeleteFunction = functions.https.onCall(async (data, context) => {
  try {
    return await handleDeleteFunction(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});
