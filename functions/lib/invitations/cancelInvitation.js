"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCancelInvitationInput = validateCancelInvitationInput;
exports.cancelInvitation = cancelInvitation;
exports.handleCancelInvitation = handleCancelInvitation;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
function validateCancelInvitationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.invitationId || typeof obj.invitationId !== 'string') {
        throw new validation_1.ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
    }
    return { invitationId: obj.invitationId };
}
/**
 * Cancels a pending invitation. Authority is verified against the
 * invitation's *stored* eventId, never one the client could supply, so a
 * client cannot retarget a cancellation at a different event's
 * invitation. Only a `pending` invitation can be cancelled — an already
 * accepted membership, or an already cancelled/expired invitation, is
 * left untouched.
 */
async function cancelInvitation(db, auth, input) {
    const invitationRef = db.collection('invitations').doc(input.invitationId);
    const snapshot = await invitationRef.get();
    const invitation = snapshot.data();
    if (!snapshot.exists || !invitation || !invitation.eventId) {
        throw new validation_1.ValidationError('invitation_not_found', 'Invitation not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, invitation.eventId, auth.uid);
    if (invitation.status !== 'pending') {
        throw new validation_1.ValidationError('invitation_not_pending', 'This invitation is no longer pending.');
    }
    const now = new Date().toISOString();
    await invitationRef.update({ status: 'cancelled', updatedAt: now });
    return { invitationId: input.invitationId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * cancel.
 */
async function handleCancelInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCancelInvitationInput(data);
    return cancelInvitation(db, { uid: context.auth.uid }, input);
}
