/**
 * Supports "accept this invitation after you log in" without a general
 * open-redirect mechanism: only a `redirect` value that points at the one
 * legitimate destination this app needs to return to is honored. Anything
 * else (an external URL, an arbitrary internal path) is ignored, and the
 * caller falls back to its normal default.
 */
const SAFE_REDIRECT_PREFIX = '/invitations/';

export function getSafeRedirectTarget(searchParams: URLSearchParams): string | null {
  const redirect = searchParams.get('redirect');
  return redirect && redirect.startsWith(SAFE_REDIRECT_PREFIX) ? redirect : null;
}

export function buildLoginRedirectUrl(pathname: string): string {
  return `/login?redirect=${encodeURIComponent(pathname)}`;
}
