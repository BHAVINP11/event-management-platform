/**
 * Guest access scoping — the client-side mirror of
 * `functions/src/guests/authorization.ts`. Used only to decide what the UI
 * offers (which guests to fetch, whether to show Add/Edit/Delete, which
 * side options a form presents); the Cloud Functions and Firestore rules
 * remain the actual authority, re-deriving the same scope independently.
 *
 * Not a generic permission engine — a small, guest-specific helper, kept in
 * sync with its backend counterpart by hand (the two run in separate
 * TypeScript projects, like every other role/enum duplicated between
 * `functions/src` and `src/types` in this app).
 */
import { EventMember, EventMemberSide, EventRole } from '@/types/membership';
import { GuestSide } from '@/types/guest';

const FULL_ACCESS_ROLES: readonly EventRole[] = [EventRole.Owner, EventRole.Planner];

/**
 * Whether a couple member's own side entitles them to a guest of the given
 * side. `both` is always in scope for either side; a member's opposite
 * side never is.
 */
export function canAccessGuestSide(memberSide: EventMemberSide | undefined, guestSide: GuestSide): boolean {
  if (memberSide === EventMemberSide.Bride) {
    return guestSide === GuestSide.Bride || guestSide === GuestSide.Both;
  }
  if (memberSide === EventMemberSide.Groom) {
    return guestSide === GuestSide.Groom || guestSide === GuestSide.Both;
  }
  return false;
}

/** Whether the membership may add/edit/remove guests at all (some side, for couple members). */
export function canManageGuests(membership: Pick<EventMember, 'role'>): boolean {
  return FULL_ACCESS_ROLES.includes(membership.role) || membership.role === EventRole.Couple;
}

/**
 * Which guest sides this membership may create or set a guest to. Empty
 * for view-only roles (family/staff/viewer) and for a couple member with
 * no side on record (defensive — shouldn't happen in practice).
 */
export function manageableGuestSides(membership: Pick<EventMember, 'role' | 'side'>): GuestSide[] {
  if (FULL_ACCESS_ROLES.includes(membership.role)) {
    return [GuestSide.Bride, GuestSide.Groom, GuestSide.Both];
  }

  if (membership.role === EventRole.Couple) {
    if (membership.side === EventMemberSide.Bride) {
      return [GuestSide.Bride, GuestSide.Both];
    }
    if (membership.side === EventMemberSide.Groom) {
      return [GuestSide.Groom, GuestSide.Both];
    }
  }

  return [];
}
