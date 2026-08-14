"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUpdateEventBudget = exports.onDeleteExpense = exports.onUpdateExpense = exports.onCreateExpense = exports.onDeleteFunction = exports.onUpdateFunction = exports.onCreateFunction = exports.onDeleteGuest = exports.onUpdateGuest = exports.onCreateGuest = exports.onGetInvitationPreview = exports.onAcceptInvitation = exports.onCreateInvitation = exports.onCreateOrganizationEvent = exports.onCreateIndividualEvent = exports.onCreateOrganization = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const createOrganization_1 = require("./onboarding/createOrganization");
const createIndividualEvent_1 = require("./events/createIndividualEvent");
const createOrganizationEvent_1 = require("./events/createOrganizationEvent");
const createInvitation_1 = require("./invitations/createInvitation");
const acceptInvitation_1 = require("./invitations/acceptInvitation");
const getInvitationPreview_1 = require("./invitations/getInvitationPreview");
const createGuest_1 = require("./guests/createGuest");
const updateGuest_1 = require("./guests/updateGuest");
const deleteGuest_1 = require("./guests/deleteGuest");
const createFunction_1 = require("./ceremonies/createFunction");
const updateFunction_1 = require("./ceremonies/updateFunction");
const deleteFunction_1 = require("./ceremonies/deleteFunction");
const createExpense_1 = require("./expenses/createExpense");
const updateExpense_1 = require("./expenses/updateExpense");
const deleteExpense_1 = require("./expenses/deleteExpense");
const updateEventBudget_1 = require("./events/updateEventBudget");
const validation_1 = require("./validation");
const errorMapping_1 = require("./errorMapping");
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
function toHttpsError(error) {
    const { firebaseCode, message, appCode } = (0, errorMapping_1.mapErrorToCallableResponse)(error);
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
exports.onCreateOrganization = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
        }
        const validatedInput = (0, createOrganization_1.validateCreateOrganizationInput)(data);
        return await (0, createOrganization_1.createOrganization)(db, { uid: context.auth.uid }, validatedInput);
    }
    catch (error) {
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
exports.onCreateIndividualEvent = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, data, context);
    }
    catch (error) {
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
exports.onCreateOrganizationEvent = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, data, context);
    }
    catch (error) {
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
exports.onCreateInvitation = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createInvitation_1.handleCreateInvitation)(db, data, context);
    }
    catch (error) {
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
exports.onAcceptInvitation = functions.https.onCall(async (data, context) => {
    try {
        return await (0, acceptInvitation_1.handleAcceptInvitation)(db, data, context);
    }
    catch (error) {
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
exports.onGetInvitationPreview = functions.https.onCall(async (data, context) => {
    try {
        return await (0, getInvitationPreview_1.handleGetInvitationPreview)(db, data, context);
    }
    catch (error) {
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
exports.onCreateGuest = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createGuest_1.handleCreateGuest)(db, data, context);
    }
    catch (error) {
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
exports.onUpdateGuest = functions.https.onCall(async (data, context) => {
    try {
        return await (0, updateGuest_1.handleUpdateGuest)(db, data, context);
    }
    catch (error) {
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
exports.onDeleteGuest = functions.https.onCall(async (data, context) => {
    try {
        return await (0, deleteGuest_1.handleDeleteGuest)(db, data, context);
    }
    catch (error) {
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
exports.onCreateFunction = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createFunction_1.handleCreateFunction)(db, data, context);
    }
    catch (error) {
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
exports.onUpdateFunction = functions.https.onCall(async (data, context) => {
    try {
        return await (0, updateFunction_1.handleUpdateFunction)(db, data, context);
    }
    catch (error) {
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
exports.onDeleteFunction = functions.https.onCall(async (data, context) => {
    try {
        return await (0, deleteFunction_1.handleDeleteFunction)(db, data, context);
    }
    catch (error) {
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
exports.onCreateExpense = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createExpense_1.handleCreateExpense)(db, data, context);
    }
    catch (error) {
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
exports.onUpdateExpense = functions.https.onCall(async (data, context) => {
    try {
        return await (0, updateExpense_1.handleUpdateExpense)(db, data, context);
    }
    catch (error) {
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
exports.onDeleteExpense = functions.https.onCall(async (data, context) => {
    try {
        return await (0, deleteExpense_1.handleDeleteExpense)(db, data, context);
    }
    catch (error) {
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
exports.onUpdateEventBudget = functions.https.onCall(async (data, context) => {
    try {
        return await (0, updateEventBudget_1.handleUpdateEventBudget)(db, data, context);
    }
    catch (error) {
        throw toHttpsError(error);
    }
});
