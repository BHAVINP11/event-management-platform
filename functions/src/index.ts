import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  createOrganization,
  validateCreateOrganizationInput
} from './onboarding/createOrganization';
import { handleCreateIndividualEvent } from './events/createIndividualEvent';
import { handleCreateOrganizationEvent } from './events/createOrganizationEvent';
import { handleUpdateEvent } from './events/updateEvent';
import { handleUpdateEventCoverImage } from './events/updateEventCoverImage';
import { handleCreateInvitation } from './invitations/createInvitation';
import { handleAcceptInvitation } from './invitations/acceptInvitation';
import { handleGetInvitationPreview } from './invitations/getInvitationPreview';
import { handleCancelInvitation } from './invitations/cancelInvitation';
import { handleResendInvitation } from './invitations/resendInvitation';
import { handleRemoveMember } from './members/removeMember';
import { handleUpdateMemberRole } from './members/updateMemberRole';
import { handleUpdateOrganization } from './organizations/updateOrganization';
import { handleRemoveOrganizationMember } from './organizations/removeMember';
import { handleUpdateOrganizationMemberRole } from './organizations/updateMemberRole';
import { handleCreateOrganizationInvitation } from './organizations/createOrganizationInvitation';
import { handleAcceptOrganizationInvitation } from './organizations/acceptOrganizationInvitation';
import { handleGetOrganizationInvitationPreview } from './organizations/getOrganizationInvitationPreview';
import { handleCancelOrganizationInvitation } from './organizations/cancelOrganizationInvitation';
import { handleResendOrganizationInvitation } from './organizations/resendOrganizationInvitation';
import { handleCreateGuest } from './guests/createGuest';
import { handleUpdateGuest } from './guests/updateGuest';
import { handleDeleteGuest } from './guests/deleteGuest';
import { handleCreateFunction } from './ceremonies/createFunction';
import { handleUpdateFunction } from './ceremonies/updateFunction';
import { handleDeleteFunction } from './ceremonies/deleteFunction';
import { handleCreateExpense } from './expenses/createExpense';
import { handleUpdateExpense } from './expenses/updateExpense';
import { handleDeleteExpense } from './expenses/deleteExpense';
import { handleUpdateEventBudget } from './events/updateEventBudget';
import { handleCreateVendor } from './vendors/createVendor';
import { handleUpdateVendor } from './vendors/updateVendor';
import { handleDeleteVendor } from './vendors/deleteVendor';
import { handleCreateTask } from './tasks/createTask';
import { handleUpdateTask } from './tasks/updateTask';
import { handleDeleteTask } from './tasks/deleteTask';
import { ValidationError } from './validation';
import { mapErrorToCallableResponse } from './errorMapping';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

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
 * Callable Cloud Function: updateOrganization
 *
 * Updates an organization's name/description/contact details. The caller
 * must have an active OrganizationMember with role owner or admin (a
 * narrower tier than who may create events for the organization). `slug`
 * and `logoUrl` are always carried over unchanged from the existing
 * document — neither is editable in this pass.
 *
 * Input:
 * {
 *   organizationId: string,
 *   name: string,
 *   description?: string,
 *   contactEmail?: string,
 *   contactPhone?: string
 * }
 *
 * Output:
 * {
 *   organizationId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - organization_not_found: Organization does not exist
 * - organization_access_denied: Caller has no active membership in the organization
 * - organization_role_not_allowed: Caller's role cannot manage the organization
 * - internal_error: Server error
 */
export const onUpdateOrganization = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateOrganization(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: removeOrganizationMember
 *
 * Removes a member from an organization. The caller must have an active
 * OrganizationMember with role owner or admin. Marks the membership
 * `revoked` rather than deleting it, mirroring `removeMember` (the event
 * domain's equivalent); this has no effect on the member's event
 * memberships, events they created, or their Firebase Auth account. The
 * organization owner can never be removed.
 *
 * Input:
 * {
 *   organizationId: string,
 *   userId: string
 * }
 *
 * Output:
 * {
 *   organizationId: string,
 *   userId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - organization_not_found: Organization does not exist
 * - organization_access_denied: Caller has no active membership in the organization
 * - organization_role_not_allowed: Caller's role cannot manage members
 * - organization_member_not_found: The target membership does not exist
 * - organization_owner_cannot_be_removed: The target is the organization owner
 * - internal_error: Server error
 */
export const onRemoveOrganizationMember = functions.https.onCall(async (data, context) => {
  try {
    return await handleRemoveOrganizationMember(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateOrganizationMemberRole
 *
 * Changes a member's role. The caller must have an active
 * OrganizationMember with role owner or admin. Reuses the same role
 * vocabulary as createOrganizationInvitation — a member can never be
 * changed to role `owner` this way. The organization owner's own role
 * can never be changed.
 *
 * Input:
 * {
 *   organizationId: string,
 *   userId: string,
 *   role: string ('admin' | 'planner' | 'staff')
 * }
 *
 * Output:
 * {
 *   organizationId: string,
 *   userId: string,
 *   role: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_role)
 * - organization_not_found: Organization does not exist
 * - organization_access_denied: Caller has no active membership in the organization
 * - organization_role_not_allowed: Caller's role cannot manage members
 * - organization_member_not_found: The target membership does not exist
 * - organization_owner_role_immutable: The target is the organization owner
 * - internal_error: Server error
 */
export const onUpdateOrganizationMemberRole = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateOrganizationMemberRole(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: createOrganizationInvitation
 *
 * Invites a person to an organization. The caller must have an active
 * OrganizationMember with role owner or admin. Creates a pending
 * OrganizationInvitation only; no OrganizationMember is created until the
 * invitation is accepted. A deliberately separate collection/lifecycle
 * from event invitations — the two domains are conceptually independent.
 *
 * Input:
 * {
 *   organizationId: string,
 *   invitedEmail: string,
 *   role: string ('admin' | 'planner' | 'staff')
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
 * - organization_not_found: Organization does not exist
 * - organization_access_denied: Caller has no active membership in the organization
 * - organization_role_not_allowed: Caller's role cannot invite people
 * - invitation_already_pending: A pending invitation already exists for this organization + email
 * - internal_error: Server error
 */
export const onCreateOrganizationInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateOrganizationInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: acceptOrganizationInvitation
 *
 * Accepts a pending organization invitation and creates the invitee's
 * OrganizationMember (deterministic ID
 * `organizationMembers/{organizationId}_{userId}`), copying role and
 * invitedBy from the invitation. The invitation is marked accepted in
 * the same atomic write.
 *
 * Input:
 * {
 *   invitationId: string
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
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation does not exist
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - invitation_expired: Invitation's expiresAt has passed
 * - invitation_email_mismatch: Caller's authenticated email does not match invitedEmail
 * - internal_error: Server error
 */
export const onAcceptOrganizationInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleAcceptOrganizationInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: getOrganizationInvitationPreview
 *
 * Read-only projection for the `/organization-invitations/:invitationId`
 * acceptance page: the organization's name plus the invitation's own
 * fields. Gated by the same email-match check as acceptance, and does
 * not require organization membership — that would defeat the point,
 * since the invitee doesn't have it yet.
 *
 * Input:
 * {
 *   invitationId: string
 * }
 *
 * Output:
 * {
 *   organizationName: string,
 *   invitedEmail: string,
 *   role: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation (or its organization) does not exist
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - invitation_expired: Invitation's expiresAt has passed
 * - invitation_email_mismatch: Caller's authenticated email does not match invitedEmail
 * - internal_error: Server error
 */
export const onGetOrganizationInvitationPreview = functions.https.onCall(async (data, context) => {
  try {
    return await handleGetOrganizationInvitationPreview(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: cancelOrganizationInvitation
 *
 * Cancels a pending organization invitation. The caller must have an
 * active OrganizationMember with role owner or admin for the
 * invitation's own organization. Only a `pending` invitation can be
 * cancelled.
 *
 * Input:
 * {
 *   invitationId: string
 * }
 *
 * Output:
 * {
 *   invitationId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation does not exist
 * - organization_access_denied: Caller has no active membership in the invitation's organization
 * - organization_role_not_allowed: Caller's role cannot manage invitations
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - internal_error: Server error
 */
export const onCancelOrganizationInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleCancelOrganizationInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: resendOrganizationInvitation
 *
 * Extends a pending organization invitation's `expiresAt` by another 14
 * days on the same document — there is no email-sending infrastructure
 * in this codebase, so this keeps the existing invitation link valid
 * rather than dispatching a new email. Works even if the invitation
 * already passed its old `expiresAt`. Only a `pending` invitation can be
 * resent.
 *
 * Input:
 * {
 *   invitationId: string
 * }
 *
 * Output:
 * {
 *   invitationId: string,
 *   expiresAt: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation does not exist
 * - organization_access_denied: Caller has no active membership in the invitation's organization
 * - organization_role_not_allowed: Caller's role cannot manage invitations
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - internal_error: Server error
 */
export const onResendOrganizationInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleResendOrganizationInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateEvent
 *
 * Edits an event's name/type/description/dates/timezone/venue/status. The
 * caller must have an active EventMember with role owner or planner. A full
 * document replacement (not a partial patch), so clearing an optional field
 * (e.g. removing a venue) actually removes it. `budgetAmount` and
 * `coverImageUrl` are always carried over unchanged from the existing
 * document — they have their own dedicated update functions
 * (`updateEventBudget`, `updateEventCoverImage`) and are never touched here.
 * `organizationId`, `createdBy`, and `createdAt` are always read from the
 * existing document, never trusted from the client.
 *
 * Input:
 * {
 *   eventId: string,
 *   name: string,
 *   type: string (EventType),
 *   description?: string,
 *   startDate: string (ISO 8601),
 *   endDate?: string (ISO 8601),
 *   timezone: string,
 *   venueName?: string,
 *   venueAddress?: string,
 *   status: string ('draft' | 'active' | 'completed' | 'archived')
 * }
 *
 * Output:
 * {
 *   eventId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_status)
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot edit the event
 * - internal_error: Server error
 */
export const onUpdateEvent = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateEvent(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateEventCoverImage
 *
 * Sets or removes an event's cover photo. The caller must have an active
 * EventMember with role owner or planner. The client uploads the file to
 * Storage directly (gated by `storage.rules`) and calls this function only
 * to persist the resulting download URL — or `null` to remove it — onto
 * the event document; the URL must reference this event's own
 * `event-covers/{eventId}/` Storage folder. Replacing or removing a
 * previous cover image deletes the old Storage object (best-effort, and
 * scoped strictly to this event's own folder) so it doesn't become an
 * orphaned file.
 *
 * Input:
 * {
 *   eventId: string,
 *   coverImageUrl: string | null
 * }
 *
 * Output:
 * {
 *   eventId: string,
 *   coverImageUrl: string | null
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_cover_image_url)
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot edit the event
 * - internal_error: Server error
 */
export const onUpdateEventCoverImage = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateEventCoverImage(db, bucket, data, context);
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
 * Callable Cloud Function: cancelInvitation
 *
 * Cancels a pending invitation. The caller must have an active
 * EventMember with role owner or planner for the invitation's own event.
 * Only a `pending` invitation can be cancelled; an already accepted
 * membership, or an already cancelled/expired invitation, is untouched.
 *
 * Input:
 * {
 *   invitationId: string
 * }
 *
 * Output:
 * {
 *   invitationId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation does not exist
 * - event_access_denied: Caller has no active membership in the invitation's event
 * - event_role_not_allowed: Caller's role cannot manage invitations
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - internal_error: Server error
 */
export const onCancelInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleCancelInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: resendInvitation
 *
 * Extends a pending invitation's `expiresAt` by another 14 days on the
 * same document — there is no email-sending infrastructure in this
 * codebase, so this keeps the existing invitation link valid rather than
 * dispatching a new email. Works even if the invitation already passed
 * its old `expiresAt`. Only a `pending` invitation can be resent.
 *
 * Input:
 * {
 *   invitationId: string
 * }
 *
 * Output:
 * {
 *   invitationId: string,
 *   expiresAt: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_invitation_id: Input validation error
 * - invitation_not_found: Invitation does not exist
 * - event_access_denied: Caller has no active membership in the invitation's event
 * - event_role_not_allowed: Caller's role cannot manage invitations
 * - invitation_not_pending: Invitation was already accepted/cancelled
 * - internal_error: Server error
 */
export const onResendInvitation = functions.https.onCall(async (data, context) => {
  try {
    return await handleResendInvitation(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: removeMember
 *
 * Removes a member from an event. The caller must have an active
 * EventMember with role owner or planner. Marks the membership `revoked`
 * rather than deleting it, so task assignments and audit history
 * referencing the user are preserved; Firestore rules already require an
 * `active` membership for event-scoped reads, so this alone fully revokes
 * access. The event owner can never be removed.
 *
 * Input:
 * {
 *   eventId: string,
 *   userId: string
 * }
 *
 * Output:
 * {
 *   eventId: string,
 *   userId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage members
 * - member_not_found: The target membership does not exist
 * - event_owner_cannot_be_removed: The target is the event owner
 * - internal_error: Server error
 */
export const onRemoveMember = functions.https.onCall(async (data, context) => {
  try {
    return await handleRemoveMember(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateMemberRole
 *
 * Changes a member's role and/or side. The caller must have an active
 * EventMember with role owner or planner. Reuses the same role/side
 * vocabulary and validation as createInvitation — a member can never be
 * changed to role `owner` this way, and a side may only be set for
 * couple/family roles. The event owner's own role can never be changed.
 *
 * Input:
 * {
 *   eventId: string,
 *   userId: string,
 *   role: string ('couple' | 'family' | 'planner' | 'staff' | 'viewer'),
 *   side?: string ('bride' | 'groom', only for role couple/family)
 * }
 *
 * Output:
 * {
 *   eventId: string,
 *   userId: string,
 *   role: string,
 *   side: string | null
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_role, invalid_side)
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage members
 * - member_not_found: The target membership does not exist
 * - event_owner_role_immutable: The target is the event owner
 * - internal_error: Server error
 */
export const onUpdateMemberRole = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateMemberRole(db, data, context);
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

/**
 * Callable Cloud Function: createExpense
 *
 * Adds an expense to an event's budget tracker. The caller must have an
 * active EventMember with role owner or planner. `id`, `eventId` (from the
 * request), `createdBy`, and the timestamps are never trusted from the
 * client beyond the requested `eventId`, which is independently verified.
 * `paidAmount` is always server-derived from `paymentStatus`/`amount`
 * (see `functions/src/expenses/shared.ts`), except for `partially_paid`,
 * where the client's figure is validated against `amount`.
 *
 * Input:
 * {
 *   eventId: string,
 *   title: string,
 *   category: string,
 *   amount: number,
 *   paymentStatus?: string ('unpaid' | 'partially_paid' | 'paid', default 'unpaid'),
 *   paidAmount?: number (required, and validated 0 <= paidAmount <= amount, only when paymentStatus is 'partially_paid'),
 *   paymentDate?: string,
 *   notes?: string
 * }
 *
 * Output:
 * {
 *   expenseId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage expenses
 * - internal_error: Server error
 */
export const onCreateExpense = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateExpense(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateExpense
 *
 * Edits an expense's fields. Authority is verified against the expense's
 * *stored* eventId, never one the client could supply, so a client cannot
 * retarget an edit at a different event's expense. `id`, `eventId`,
 * `createdBy`, and `createdAt` are carried over from the existing
 * document.
 *
 * Input: same shape as createExpense, plus `expenseId: string` in place of `eventId`.
 *
 * Output:
 * {
 *   expenseId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - expense_not_found: Expense does not exist
 * - event_access_denied: Caller has no active membership in the expense's event
 * - event_role_not_allowed: Caller's role cannot manage expenses
 * - internal_error: Server error
 */
export const onUpdateExpense = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateExpense(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: deleteExpense
 *
 * Removes an expense. Authority is verified against the expense's
 * *stored* eventId, exactly like updateExpense.
 *
 * Input:
 * {
 *   expenseId: string
 * }
 *
 * Output:
 * {
 *   expenseId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_expense_id: Input validation error
 * - expense_not_found: Expense does not exist
 * - event_access_denied: Caller has no active membership in the expense's event
 * - event_role_not_allowed: Caller's role cannot manage expenses
 * - internal_error: Server error
 */
export const onDeleteExpense = functions.https.onCall(async (data, context) => {
  try {
    return await handleDeleteExpense(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateEventBudget
 *
 * Sets an event's budget amount. The caller must have an active
 * EventMember with role owner or planner. Patches only `budgetAmount` (and
 * `updatedAt`) on the existing event document — the budget is a field on
 * the Event itself, not a separate collection or document.
 *
 * Input:
 * {
 *   eventId: string,
 *   budgetAmount: number
 * }
 *
 * Output:
 * {
 *   eventId: string,
 *   budgetAmount: number
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_budget_amount: Input validation error
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage the budget
 * - internal_error: Server error
 */
export const onUpdateEventBudget = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateEventBudget(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: createVendor
 *
 * Adds a vendor to an event. The caller must have an active EventMember
 * with role owner or planner. `id`, `eventId` (from the request),
 * `createdBy`, and the timestamps are never trusted from the client
 * beyond the requested `eventId`, which is independently verified.
 *
 * Input:
 * {
 *   eventId: string,
 *   name: string,
 *   category: string,
 *   phone?: string,
 *   email?: string,
 *   notes?: string,
 *   status?: string ('enquiry' | 'shortlisted' | 'confirmed' | 'cancelled', default 'enquiry')
 * }
 *
 * Output:
 * {
 *   vendorId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot manage vendors
 * - internal_error: Server error
 */
export const onCreateVendor = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateVendor(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateVendor
 *
 * Edits a vendor's fields. Authority is verified against the vendor's
 * *stored* eventId, never one the client could supply, so a client cannot
 * retarget an edit at a different event's vendor. `id`, `eventId`,
 * `createdBy`, and `createdAt` are carried over from the existing
 * document.
 *
 * Input: same shape as createVendor, plus `vendorId: string` in place of `eventId`.
 *
 * Output:
 * {
 *   vendorId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error
 * - vendor_not_found: Vendor does not exist
 * - event_access_denied: Caller has no active membership in the vendor's event
 * - event_role_not_allowed: Caller's role cannot manage vendors
 * - internal_error: Server error
 */
export const onUpdateVendor = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateVendor(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: deleteVendor
 *
 * Removes a vendor. Authority is verified against the vendor's *stored*
 * eventId, exactly like updateVendor.
 *
 * Input:
 * {
 *   vendorId: string
 * }
 *
 * Output:
 * {
 *   vendorId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_vendor_id: Input validation error
 * - vendor_not_found: Vendor does not exist
 * - event_access_denied: Caller has no active membership in the vendor's event
 * - event_role_not_allowed: Caller's role cannot manage vendors
 * - internal_error: Server error
 */
export const onDeleteVendor = functions.https.onCall(async (data, context) => {
  try {
    return await handleDeleteVendor(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: createTask
 *
 * Adds a task to an event. The caller must have an active EventMember
 * with role owner or planner (see `functions/src/tasks/authorization.ts`
 * — staff may update but never create tasks). If `assignedTo` is
 * supplied, it must be an active EventMember of the same event — never
 * trusted as a bare user ID. `id`, `eventId` (from the request),
 * `createdBy`, and the timestamps are never trusted from the client
 * beyond the requested `eventId`, which is independently verified.
 *
 * Input:
 * {
 *   eventId: string,
 *   title: string,
 *   description?: string,
 *   dueDate?: string,
 *   status?: string ('todo' | 'in_progress' | 'completed' | 'cancelled', default 'todo'),
 *   priority?: string ('low' | 'medium' | 'high', default 'medium'),
 *   assignedTo?: string (an EventMember's user ID, not a Guest ID)
 * }
 *
 * Output:
 * {
 *   taskId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_assigned_to)
 * - event_not_found: Event does not exist
 * - event_access_denied: Caller has no active membership in the event
 * - event_role_not_allowed: Caller's role cannot create tasks
 * - internal_error: Server error
 */
export const onCreateTask = functions.https.onCall(async (data, context) => {
  try {
    return await handleCreateTask(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: updateTask
 *
 * Edits a task's fields. Authority is verified against the task's
 * *stored* eventId and *stored* assignedTo — owner/planner may update any
 * task; staff only a task currently assigned to themselves (see
 * `functions/src/tasks/authorization.ts`). If `assignedTo` is supplied, it
 * must be an active EventMember of the same event. `id`, `eventId`,
 * `createdBy`, and `createdAt` are carried over from the existing
 * document.
 *
 * Input: same shape as createTask, plus `taskId: string` in place of `eventId`.
 *
 * Output:
 * {
 *   taskId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_*: Input validation error (including invalid_assigned_to)
 * - task_not_found: Task does not exist
 * - event_access_denied: Caller has no active membership in the task's event
 * - event_role_not_allowed: Caller's role cannot update tasks at all
 * - task_assignment_not_allowed: Staff caller, but this task isn't assigned to them
 * - internal_error: Server error
 */
export const onUpdateTask = functions.https.onCall(async (data, context) => {
  try {
    return await handleUpdateTask(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});

/**
 * Callable Cloud Function: deleteTask
 *
 * Removes a task. Authority is verified against the task's *stored*
 * eventId — owner/planner only, never staff (even for their own assigned
 * task).
 *
 * Input:
 * {
 *   taskId: string
 * }
 *
 * Output:
 * {
 *   taskId: string
 * }
 *
 * Errors (`error.details.appCode`, alongside a standard `error.code`):
 * - unauthenticated: Caller is not authenticated
 * - invalid_task_id: Input validation error
 * - task_not_found: Task does not exist
 * - event_access_denied: Caller has no active membership in the task's event
 * - event_role_not_allowed: Caller's role cannot delete tasks
 * - internal_error: Server error
 */
export const onDeleteTask = functions.https.onCall(async (data, context) => {
  try {
    return await handleDeleteTask(db, data, context);
  } catch (error) {
    throw toHttpsError(error);
  }
});
