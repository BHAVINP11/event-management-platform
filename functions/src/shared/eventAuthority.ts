import { ValidationError } from '../validation';
import { getEventMembershipId } from './membershipIds';

/**
 * Event roles expected to manage an event's collaborator list and content
 * (inviting people, adding/editing/removing guests, ...). Used by every
 * Cloud Function that needs an "is this caller allowed to manage this
 * event" check — first written for invitations, reused as-is for guests
 * rather than duplicated.
 */
const EVENT_MANAGEMENT_ROLES = ['owner', 'planner'];

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
export async function verifyEventManagementAuthority(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  userId: string
): Promise<void> {
  const eventSnapshot = await db.collection('events').doc(eventId).get();
  if (!eventSnapshot.exists) {
    throw new ValidationError('event_not_found', 'Event not found.');
  }

  const membershipId = getEventMembershipId(eventId, userId);
  const membershipSnapshot = await db.collection('eventMembers').doc(membershipId).get();
  const membership = membershipSnapshot.data() as
    | { eventId?: string; status?: string; role?: string }
    | undefined;

  if (
    !membershipSnapshot.exists ||
    !membership ||
    membership.eventId !== eventId ||
    membership.status !== 'active'
  ) {
    throw new ValidationError('event_access_denied', 'You do not have access to this event.');
  }

  if (!membership.role || !EVENT_MANAGEMENT_ROLES.includes(membership.role)) {
    throw new ValidationError('event_role_not_allowed', 'Your role does not allow managing this event.');
  }
}
