"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadActiveEventMembership = loadActiveEventMembership;
exports.verifyEventManagementAuthority = verifyEventManagementAuthority;
const validation_1 = require("../validation");
const membershipIds_1 = require("./membershipIds");
/**
 * Event roles expected to manage an event's collaborator list and content
 * (inviting people, adding/editing/removing guests, ...). Used by every
 * Cloud Function that needs an "is this caller allowed to manage this
 * event" check — first written for invitations, reused as-is for guests
 * rather than duplicated.
 */
const EVENT_MANAGEMENT_ROLES = ['owner', 'planner'];
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
async function loadActiveEventMembership(db, eventId, userId) {
    const eventSnapshot = await db.collection('events').doc(eventId).get();
    if (!eventSnapshot.exists) {
        throw new validation_1.ValidationError('event_not_found', 'Event not found.');
    }
    const membershipId = (0, membershipIds_1.getEventMembershipId)(eventId, userId);
    const membershipSnapshot = await db.collection('eventMembers').doc(membershipId).get();
    const membership = membershipSnapshot.data();
    if (!membershipSnapshot.exists ||
        !membership ||
        membership.eventId !== eventId ||
        membership.status !== 'active') {
        throw new validation_1.ValidationError('event_access_denied', 'You do not have access to this event.');
    }
    return { role: membership.role ?? '', side: membership.side };
}
/**
 * Verifies the caller has an active event membership with a management
 * role (owner or planner) for the given event.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 * @throws ValidationError('event_access_denied') if there is no active membership
 * @throws ValidationError('event_role_not_allowed') if the role cannot manage the event
 */
async function verifyEventManagementAuthority(db, eventId, userId) {
    const membership = await loadActiveEventMembership(db, eventId, userId);
    if (!membership.role || !EVENT_MANAGEMENT_ROLES.includes(membership.role)) {
        throw new validation_1.ValidationError('event_role_not_allowed', 'Your role does not allow managing this event.');
    }
}
