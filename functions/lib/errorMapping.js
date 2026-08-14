"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapErrorToCallableResponse = mapErrorToCallableResponse;
const validation_1 = require("./validation");
/** Application codes that map to something other than the invalid_* rule or 'internal'. */
const KNOWN_APP_CODES = {
    unauthenticated: 'unauthenticated',
    permission_denied: 'permission-denied',
    organization_access_denied: 'permission-denied',
    organization_role_not_allowed: 'permission-denied',
    organization_not_found: 'not-found',
    conflict: 'already-exists',
    organization_slug_taken: 'already-exists',
    internal_error: 'internal',
    event_not_found: 'not-found',
    event_access_denied: 'permission-denied',
    event_role_not_allowed: 'permission-denied',
    invitation_already_pending: 'already-exists',
    invitation_not_found: 'not-found',
    invitation_not_pending: 'failed-precondition',
    invitation_expired: 'failed-precondition',
    invitation_email_mismatch: 'permission-denied'
};
function firebaseCodeFor(appCode) {
    if (appCode in KNOWN_APP_CODES) {
        return KNOWN_APP_CODES[appCode];
    }
    return appCode.startsWith('invalid_') ? 'invalid-argument' : 'internal';
}
/**
 * Maps any error thrown by a callable's business logic to the callable error
 * response: a valid Firebase code, a user-safe message, and the original
 * application code for the client to key its own messaging off of.
 *
 * Firestore/Admin SDK errors (which surface as plain `Error`s, not
 * `ValidationError`) are pattern-matched defensively and never have their raw
 * message forwarded to the client.
 */
function mapErrorToCallableResponse(error) {
    if (error instanceof validation_1.ValidationError) {
        return {
            firebaseCode: firebaseCodeFor(error.code),
            message: error.message,
            appCode: error.code
        };
    }
    if (error instanceof Error) {
        if (error.message.includes('ALREADY_EXISTS') || error.message.includes('already exists')) {
            return {
                firebaseCode: 'already-exists',
                message: 'This resource already exists.',
                appCode: 'conflict'
            };
        }
        if (error.message.includes('PERMISSION_DENIED')) {
            return {
                firebaseCode: 'permission-denied',
                message: 'You do not have permission to perform this action.',
                appCode: 'permission_denied'
            };
        }
    }
    return {
        firebaseCode: 'internal',
        message: 'An unexpected error occurred. Please try again.',
        appCode: 'internal_error'
    };
}
