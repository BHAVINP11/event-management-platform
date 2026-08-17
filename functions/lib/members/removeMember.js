"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRemoveMemberInput = validateRemoveMemberInput;
exports.removeMember = removeMember;
exports.handleRemoveMember = handleRemoveMember;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const membershipIds_1 = require("../shared/membershipIds");
function validateRemoveMemberInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    if (!obj.userId || typeof obj.userId !== 'string') {
        throw new validation_1.ValidationError('invalid_user_id', 'userId must be a non-empty string.');
    }
    return { eventId: obj.eventId, userId: obj.userId };
}
/**
 * Removes a member from an event. The caller must have an active
 * EventMember with role owner or planner. Removal marks the membership
 * `revoked` rather than deleting the document — Firestore rules already
 * require `status == 'active'` for every event-scoped read, so revocation
 * alone instantly and completely removes the member's access with no rule
 * changes, and preserves the document (and anything referencing the
 * user's ID, like task `assignedTo`) instead of orphaning it. The event
 * owner can never be removed this way — ownership transfer is a separate,
 * larger decision this pass deliberately does not implement.
 */
async function removeMember(db, auth, input) {
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, auth.uid);
    const membershipId = (0, membershipIds_1.getEventMembershipId)(input.eventId, input.userId);
    const membershipRef = db.collection('eventMembers').doc(membershipId);
    const snapshot = await membershipRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing) {
        throw new validation_1.ValidationError('member_not_found', 'This member could not be found.');
    }
    if (existing.role === 'owner') {
        throw new validation_1.ValidationError('event_owner_cannot_be_removed', 'The event owner cannot be removed.');
    }
    const now = new Date().toISOString();
    await membershipRef.update({ status: 'revoked', updatedAt: now });
    return { eventId: input.eventId, userId: input.userId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * remove.
 */
async function handleRemoveMember(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateRemoveMemberInput(data);
    return removeMember(db, { uid: context.auth.uid }, input);
}
