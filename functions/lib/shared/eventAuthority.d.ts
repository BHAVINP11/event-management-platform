/** The caller's own active membership for an event — role and, for couple members, side. */
export interface ActiveEventMembership {
    role: string;
    side?: string;
}
/**
 * Loads the caller's active event membership, by its deterministic ID
 * rather than trusting anything the client asserted about its own access.
 * The building block both `verifyEventManagementAuthority` (owner/planner
 * only) and guest-scoped authorization (`functions/src/guests/
 * authorization.ts`, which also needs `side`) are built from.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 * @throws ValidationError('event_access_denied') if there is no active membership
 */
export declare function loadActiveEventMembership(db: FirebaseFirestore.Firestore, eventId: string, userId: string): Promise<ActiveEventMembership>;
/**
 * Verifies the caller has an active event membership with a management
 * role (owner or planner) for the given event.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 * @throws ValidationError('event_access_denied') if there is no active membership
 * @throws ValidationError('event_role_not_allowed') if the role cannot manage the event
 */
export declare function verifyEventManagementAuthority(db: FirebaseFirestore.Firestore, eventId: string, userId: string): Promise<void>;
