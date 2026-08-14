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
export type FirebaseCallableErrorCode = 'unauthenticated' | 'invalid-argument' | 'not-found' | 'permission-denied' | 'already-exists' | 'internal';
/**
 * Maps any error thrown by a callable's business logic to the callable error
 * response: a valid Firebase code, a user-safe message, and the original
 * application code for the client to key its own messaging off of.
 *
 * Firestore/Admin SDK errors (which surface as plain `Error`s, not
 * `ValidationError`) are pattern-matched defensively and never have their raw
 * message forwarded to the client.
 */
export declare function mapErrorToCallableResponse(error: unknown): CallableErrorResponse;
