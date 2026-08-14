import { ValidationError } from './validation';

/**
 * The callable error shape every `onCall` handler in index.ts throws from.
 *
 * Firebase's `HttpsError` only accepts a fixed, small set of gRPC-style codes
 * (`invalid-argument`, `not-found`, `permission-denied`, ...) — the
 * application's own codes (`invalid_name`, `organization_role_not_allowed`,
 * ...) are not valid codes and must never be passed to it directly.
 * `firebaseCode` is what `HttpsError` receives; `appCode` is preserved
 * verbatim in `details.appCode` so the client can still recover the precise
 * reason and choose its own friendly message.
 */
export interface CallableErrorResponse {
  firebaseCode: FirebaseCallableErrorCode;
  message: string;
  appCode: string;
}

/**
 * The callable error codes this module ever produces. A subset of
 * `functions.https.FunctionsErrorCode` — narrow enough to type-check without
 * importing `firebase-functions` here, which would pull Admin SDK types into
 * a module that otherwise has no Firebase dependency and is unit tested
 * without one.
 */
export type FirebaseCallableErrorCode =
  | 'unauthenticated'
  | 'invalid-argument'
  | 'not-found'
  | 'permission-denied'
  | 'already-exists'
  | 'failed-precondition'
  | 'internal';

/** Application codes that map to something other than the invalid_* rule or 'internal'. */
const KNOWN_APP_CODES: Record<string, FirebaseCallableErrorCode> = {
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
  invitation_email_mismatch: 'permission-denied',
  guest_not_found: 'not-found',
  guest_side_not_allowed: 'permission-denied',
  function_not_found: 'not-found',
  expense_not_found: 'not-found'
};

function firebaseCodeFor(appCode: string): FirebaseCallableErrorCode {
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
export function mapErrorToCallableResponse(error: unknown): CallableErrorResponse {
  if (error instanceof ValidationError) {
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
