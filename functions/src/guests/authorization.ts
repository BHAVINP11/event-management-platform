/**
 * Guest access scoping.
 *
 * A small, guest-specific authorization helper — not a generic permission
 * engine. Owner/planner have unrestricted access. A `couple` member is
 * scoped to their own side (`bride` or `groom`) plus `both`. Family, staff,
 * and viewer are view-only and — for this step — see every guest
 * regardless of side (see docs/guests.md for why Family isn't scoped yet).
 */
import { ValidationError } from '../validation';

export interface GuestMembership {
  role: string;
  side?: string;
}

/** Roles with unrestricted guest access, regardless of side. */
const FULL_ACCESS_ROLES = ['owner', 'planner'];
const COUPLE_ROLE = 'couple';

/**
 * Whether a couple member's own side entitles them to a guest of the given
 * side. `both` is always in scope for either side; a member's opposite
 * side never is.
 */
export function canAccessGuestSide(memberSide: string | undefined, guestSide: string): boolean {
  if (memberSide === 'bride') {
    return guestSide === 'bride' || guestSide === 'both';
  }
  if (memberSide === 'groom') {
    return guestSide === 'groom' || guestSide === 'both';
  }
  return false;
}

/**
 * Whether the membership may view a guest of the given side. Not currently
 * enforced through this function directly — guest listing scopes the query
 * itself (see `functions/src/guests/shared.ts` callers / `GuestService` on
 * the client) — but kept here as the single definition of "may view,"
 * consistent with canCreate/Update/Delete below.
 */
export function canViewGuest(membership: GuestMembership, guestSide: string): boolean {
  if (FULL_ACCESS_ROLES.includes(membership.role)) {
    return true;
  }
  if (membership.role === COUPLE_ROLE) {
    return canAccessGuestSide(membership.side, guestSide);
  }
  return true;
}

/** Whether the membership may create a guest of the given side. */
export function canCreateGuest(membership: GuestMembership, requestedSide: string): boolean {
  if (FULL_ACCESS_ROLES.includes(membership.role)) {
    return true;
  }
  if (membership.role === COUPLE_ROLE) {
    return canAccessGuestSide(membership.side, requestedSide);
  }
  return false;
}

/**
 * Whether the membership may update a guest whose current side is
 * `existingSide` to become `requestedSide`. A couple member must be
 * entitled to both the guest's current side (to touch it at all) and the
 * requested side (the destination) — this is what makes bride→both allowed
 * while bride→groom is rejected.
 */
export function canUpdateGuest(membership: GuestMembership, existingSide: string, requestedSide: string): boolean {
  if (FULL_ACCESS_ROLES.includes(membership.role)) {
    return true;
  }
  if (membership.role === COUPLE_ROLE) {
    return canAccessGuestSide(membership.side, existingSide) && canAccessGuestSide(membership.side, requestedSide);
  }
  return false;
}

/** Whether the membership may delete a guest of the given side. */
export function canDeleteGuest(membership: GuestMembership, guestSide: string): boolean {
  if (FULL_ACCESS_ROLES.includes(membership.role)) {
    return true;
  }
  if (membership.role === COUPLE_ROLE) {
    return canAccessGuestSide(membership.side, guestSide);
  }
  return false;
}

/**
 * Throws the appropriate denial for a failed guest write check. A couple
 * member denied because of *side* gets `guest_side_not_allowed`; anyone
 * else (family/staff/viewer) is denied on *role* alone —
 * `event_role_not_allowed`, the same code
 * `verifyEventManagementAuthority` uses for that case.
 */
function denyGuestWrite(membership: GuestMembership): never {
  if (membership.role === COUPLE_ROLE) {
    throw new ValidationError('guest_side_not_allowed', 'Your side does not allow access to this guest.');
  }
  throw new ValidationError('event_role_not_allowed', 'Your role does not allow managing guests for this event.');
}

export function assertCanCreateGuest(membership: GuestMembership, requestedSide: string): void {
  if (!canCreateGuest(membership, requestedSide)) {
    denyGuestWrite(membership);
  }
}

export function assertCanUpdateGuest(
  membership: GuestMembership,
  existingSide: string,
  requestedSide: string
): void {
  if (!canUpdateGuest(membership, existingSide, requestedSide)) {
    denyGuestWrite(membership);
  }
}

export function assertCanDeleteGuest(membership: GuestMembership, guestSide: string): void {
  if (!canDeleteGuest(membership, guestSide)) {
    denyGuestWrite(membership);
  }
}
