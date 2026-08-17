"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateMemberRoleInput = validateUpdateMemberRoleInput;
exports.updateMemberRole = updateMemberRole;
exports.handleUpdateMemberRole = handleUpdateMemberRole;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const membershipIds_1 = require("../shared/membershipIds");
const shared_1 = require("../invitations/shared");
function validateUpdateMemberRoleInput(input) {
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
    const role = (0, shared_1.validateInvitationRole)(obj.role);
    const side = (0, shared_1.validateInvitationSide)(obj.side, role);
    return { eventId: obj.eventId, userId: obj.userId, role, side };
}
/**
 * Changes a member's role and/or side. The caller must have an active
 * EventMember with role owner or planner. Reuses the exact role/side
 * vocabulary and validation `createInvitation` already established
 * (`INVITABLE_EVENT_ROLES` excludes `owner`, so a member can never be
 * promoted *to* owner this way, and `validateInvitationSide` already
 * rejects a side on a role that doesn't allow one) rather than
 * duplicating it. The event owner's own role can never be changed here —
 * ownership transfer is a separate, larger decision this pass
 * deliberately does not implement.
 */
async function updateMemberRole(db, auth, input) {
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, auth.uid);
    const membershipId = (0, membershipIds_1.getEventMembershipId)(input.eventId, input.userId);
    const membershipRef = db.collection('eventMembers').doc(membershipId);
    const snapshot = await membershipRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing) {
        throw new validation_1.ValidationError('member_not_found', 'This member could not be found.');
    }
    if (existing.role === 'owner') {
        throw new validation_1.ValidationError('event_owner_role_immutable', "The event owner's role cannot be changed.");
    }
    const now = new Date().toISOString();
    const side = input.side ?? null;
    await membershipRef.update({ role: input.role, side, updatedAt: now });
    return { eventId: input.eventId, userId: input.userId, role: input.role, side };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
async function handleUpdateMemberRole(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateMemberRoleInput(data);
    return updateMemberRole(db, { uid: context.auth.uid }, input);
}
