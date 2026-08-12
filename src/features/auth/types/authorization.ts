export type AuthorizationDenyReason =
  | 'unauthenticated'
  | 'membership_not_found'
  | 'membership_inactive'
  | 'resource_not_found'
  | 'infrastructure_error';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: AuthorizationDenyReason;
}
