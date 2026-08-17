"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCancelOrganizationInvitationInput = validateCancelOrganizationInvitationInput;
exports.cancelOrganizationInvitation = cancelOrganizationInvitation;
exports.handleCancelOrganizationInvitation = handleCancelOrganizationInvitation;
const validation_1 = require("../validation");
const organizationAuthority_1 = require("../shared/organizationAuthority");
function validateCancelOrganizationInvitationInput(input) {
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
 * Cancels a pending organization invitation. Authority is verified
 * against the invitation's *stored* organizationId, never one the client
 * could supply, so a client cannot retarget a cancellation at a
 * different organization's invitation. Only a `pending` invitation can
 * be cancelled — an already accepted membership, or an already
 * cancelled/expired invitation, is left untouched. Mirrors
 * `functions/src/invitations/cancelInvitation.ts` exactly, for the
 * `organizationInvitations` collection.
 */
async function cancelOrganizationInvitation(db, auth, input) {
    const invitationRef = db.collection('organizationInvitations').doc(input.invitationId);
    const snapshot = await invitationRef.get();
    const invitation = snapshot.data();
    if (!snapshot.exists || !invitation || !invitation.organizationId) {
        throw new validation_1.ValidationError('invitation_not_found', 'Invitation not found.');
    }
    await (0, organizationAuthority_1.verifyOrganizationManagementAuthority)(db, invitation.organizationId, auth.uid);
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
async function handleCancelOrganizationInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCancelOrganizationInvitationInput(data);
    return cancelOrganizationInvitation(db, { uid: context.auth.uid }, input);
}
