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
exports.onCreateOrganizationEvent = exports.onCreateIndividualEvent = exports.onCreateOrganization = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const createOrganization_1 = require("./onboarding/createOrganization");
const createIndividualEvent_1 = require("./events/createIndividualEvent");
const createOrganizationEvent_1 = require("./events/createOrganizationEvent");
const validation_1 = require("./validation");
// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
/**
 * Map validation and application errors to callable function error codes.
 */
function mapErrorToResponse(error) {
    if (error instanceof validation_1.ValidationError) {
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
exports.onCreateOrganization = functions.https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    try {
        // Validate input
        const validatedInput = (0, createOrganization_1.validateCreateOrganizationInput)(data);
        // Call business logic with auth context
        const result = await (0, createOrganization_1.createOrganization)(db, { uid: context.auth.uid }, validatedInput);
        return result;
    }
    catch (error) {
        const errorResponse = mapErrorToResponse(error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new functions.https.HttpsError(errorResponse.code, errorResponse.message);
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
exports.onCreateIndividualEvent = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, data, context);
    }
    catch (error) {
        const errorResponse = mapErrorToResponse(error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new functions.https.HttpsError(errorResponse.code, errorResponse.message);
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
exports.onCreateOrganizationEvent = functions.https.onCall(async (data, context) => {
    try {
        return await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, data, context);
    }
    catch (error) {
        const errorResponse = mapErrorToResponse(error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new functions.https.HttpsError(errorResponse.code, errorResponse.message);
    }
});
