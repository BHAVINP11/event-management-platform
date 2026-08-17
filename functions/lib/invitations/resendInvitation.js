"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResendInvitationInput = validateResendInvitationInput;
exports.resendInvitation = resendInvitation;
exports.handleResendInvitation = handleResendInvitation;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const createInvitation_1 = require("./createInvitation");
function validateResendInvitationInput(input) {
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
 * "Resends" a pending invitation by extending its `expiresAt` another
 * `INVITATION_EXPIRY_DAYS` from now, on the same document — there is no
 * email-sending infrastructure anywhere in this codebase, so resend
 * cannot dispatch a new email; this keeps the invitation link (and its
 * ID) valid rather than fabricating one. It intentionally works even
 * when the invitation has already passed its old `expiresAt` (the
 * invitee never accepted in time) — extending it is exactly what makes
 * that link acceptable again. A `cancelled` or already `accepted`
 * invitation cannot be resent. Authority is verified against the
 * invitation's *stored* eventId, exactly like `cancelInvitation`.
 */
async function resendInvitation(db, auth, input) {
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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + createInvitation_1.INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await invitationRef.update({ expiresAt, updatedAt: now.toISOString() });
    return { invitationId: input.invitationId, expiresAt };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * resend.
 */
async function handleResendInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateResendInvitationInput(data);
    return resendInvitation(db, { uid: context.auth.uid }, input);
}
