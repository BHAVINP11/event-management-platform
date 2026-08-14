export interface GuestMembership {
    role: string;
    side?: string;
}
/**
 * Whether a couple member's own side entitles them to a guest of the given
 * side. `both` is always in scope for either side; a member's opposite
 * side never is.
 */
export declare function canAccessGuestSide(memberSide: string | undefined, guestSide: string): boolean;
/**
 * Whether the membership may view a guest of the given side. Not currently
 * enforced through this function directly — guest listing scopes the query
 * itself (see `functions/src/guests/shared.ts` callers / `GuestService` on
 * the client) — but kept here as the single definition of "may view,"
 * consistent with canCreate/Update/Delete below.
 */
export declare function canViewGuest(membership: GuestMembership, guestSide: string): boolean;
/** Whether the membership may create a guest of the given side. */
export declare function canCreateGuest(membership: GuestMembership, requestedSide: string): boolean;
/**
 * Whether the membership may update a guest whose current side is
 * `existingSide` to become `requestedSide`. A couple member must be
 * entitled to both the guest's current side (to touch it at all) and the
 * requested side (the destination) — this is what makes bride→both allowed
 * while bride→groom is rejected.
 */
export declare function canUpdateGuest(membership: GuestMembership, existingSide: string, requestedSide: string): boolean;
/** Whether the membership may delete a guest of the given side. */
export declare function canDeleteGuest(membership: GuestMembership, guestSide: string): boolean;
export declare function assertCanCreateGuest(membership: GuestMembership, requestedSide: string): void;
export declare function assertCanUpdateGuest(membership: GuestMembership, existingSide: string, requestedSide: string): void;
export declare function assertCanDeleteGuest(membership: GuestMembership, guestSide: string): void;
