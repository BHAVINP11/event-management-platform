/**
 * Verifies the caller has an active event membership with a management
 * role (owner or planner) for the given event. Loads the membership by its
 * deterministic ID rather than trusting anything the client asserted about
 * its own access.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 * @throws ValidationError('event_access_denied') if there is no active membership
 * @throws ValidationError('event_role_not_allowed') if the role cannot manage the event
 */
export declare function verifyEventManagementAuthority(db: FirebaseFirestore.Firestore, eventId: string, userId: string): Promise<void>;
