/**
 * The shape callable functions receive as `context`, narrowed to what
 * business logic actually needs. Deliberately narrower than
 * `functions.https.CallableContext` so business-logic modules — and their
 * tests — never need to import `firebase-functions` or initialize the Admin
 * SDK.
 *
 * `token.email` is used by invitation acceptance to verify the authenticated
 * caller is the person the invitation was sent to.
 */
export interface CallableAuthContext {
  auth?: {
    uid: string;
    token?: { email?: string };
  } | null;
}
