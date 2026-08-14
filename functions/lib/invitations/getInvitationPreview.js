"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGetInvitationPreviewInput = validateGetInvitationPreviewInput;
exports.getInvitationPreview = getInvitationPreview;
exports.handleGetInvitationPreview = handleGetInvitationPreview;
const validation_1 = require("../validation");
const acceptInvitation_1 = require("./acceptInvitation");
/**
 * Read-only projection for the `/invitations/:invitationId` acceptance page.
 *
 * The invitee cannot read `events/{eventId}` directly — Firestore rules only
 * grant that to active event members, and accepting is exactly what makes
 * them one. Rather than widen that read rule (which would expose the full
 * event document — venue, dates, description — to anyone with an invitation
 * link), this callable returns only the event name, gated by the same
 * email-match check `acceptInvitation` uses. "Do not grant access before
 * acceptance" applies to more than just the EventMember write.
 */
function validateGetInvitationPreviewInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.invitationId || typeof obj.invitationId !== 'string') {
        throw new validation_1.ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
    }
    return { invitationId: obj.invitationId };
}
async function getInvitationPreview(db, auth, input) {
    const { data: invitation } = await (0, acceptInvitation_1.loadAcceptableInvitation)(db, input.invitationId);
    (0, acceptInvitation_1.assertInvitationBelongsToCaller)(invitation.invitedEmail, auth.email);
    const eventSnapshot = await db.collection('events').doc(invitation.eventId).get();
    const event = eventSnapshot.data();
    if (!eventSnapshot.exists || !event?.name) {
        throw new validation_1.ValidationError('invitation_not_found', 'Invitation not found.');
    }
    return {
        eventName: event.name,
        invitedEmail: invitation.invitedEmail,
        role: invitation.role,
        side: invitation.side ?? null
    };
}
/**
 * Callable-function orchestration: authenticate, validate, load.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleGetInvitationPreview(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateGetInvitationPreviewInput(data);
    return getInvitationPreview(db, { email: context.auth.token?.email }, input);
}
