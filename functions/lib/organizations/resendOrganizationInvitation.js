"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResendOrganizationInvitationInput = validateResendOrganizationInvitationInput;
exports.resendOrganizationInvitation = resendOrganizationInvitation;
exports.handleResendOrganizationInvitation = handleResendOrganizationInvitation;
const validation_1 = require("../validation");
const organizationAuthority_1 = require("../shared/organizationAuthority");
const createOrganizationInvitation_1 = require("./createOrganizationInvitation");
function validateResendOrganizationInvitationInput(input) {
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
 * "Resends" a pending organization invitation by extending its
 * `expiresAt` another `ORGANIZATION_INVITATION_EXPIRY_DAYS` from now, on
 * the same document — there is no email-sending infrastructure anywhere
 * in this codebase, so resend cannot dispatch a new email; this keeps
 * the invitation link (and its ID) valid rather than fabricating one,
 * mirroring `functions/src/invitations/resendInvitation.ts` exactly. It
 * intentionally works even when the invitation has already passed its
 * old `expiresAt`. A `cancelled` or already `accepted` invitation cannot
 * be resent. Authority is verified against the invitation's *stored*
 * organizationId, exactly like `cancelOrganizationInvitation`.
 */
async function resendOrganizationInvitation(db, auth, input) {
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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + createOrganizationInvitation_1.ORGANIZATION_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await invitationRef.update({ expiresAt, updatedAt: now.toISOString() });
    return { invitationId: input.invitationId, expiresAt };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * resend.
 */
async function handleResendOrganizationInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateResendOrganizationInvitationInput(data);
    return resendOrganizationInvitation(db, { uid: context.auth.uid }, input);
}
