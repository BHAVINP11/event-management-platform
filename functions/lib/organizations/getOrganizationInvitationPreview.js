"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGetOrganizationInvitationPreviewInput = validateGetOrganizationInvitationPreviewInput;
exports.getOrganizationInvitationPreview = getOrganizationInvitationPreview;
exports.handleGetOrganizationInvitationPreview = handleGetOrganizationInvitationPreview;
const validation_1 = require("../validation");
const acceptOrganizationInvitation_1 = require("./acceptOrganizationInvitation");
/**
 * Read-only projection for the `/organization-invitations/:invitationId`
 * acceptance page. The invitee cannot read `organizations/{organizationId}`
 * directly — Firestore rules only grant that to active organization
 * members, and accepting is exactly what makes them one. Rather than
 * widen that read rule (which would expose the full organization
 * document to anyone with an invitation link), this callable returns
 * only the organization name, gated by the same email-match check
 * `acceptOrganizationInvitation` uses — mirrors `functions/src/
 * invitations/getInvitationPreview.ts` exactly.
 */
function validateGetOrganizationInvitationPreviewInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.invitationId || typeof obj.invitationId !== 'string') {
        throw new validation_1.ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
    }
    return { invitationId: obj.invitationId };
}
async function getOrganizationInvitationPreview(db, auth, input) {
    const { data: invitation } = await (0, acceptOrganizationInvitation_1.loadAcceptableOrganizationInvitation)(db, input.invitationId);
    (0, acceptOrganizationInvitation_1.assertOrganizationInvitationBelongsToCaller)(invitation.invitedEmail, auth.email);
    const organizationSnapshot = await db.collection('organizations').doc(invitation.organizationId).get();
    const organization = organizationSnapshot.data();
    if (!organizationSnapshot.exists || !organization?.name) {
        throw new validation_1.ValidationError('invitation_not_found', 'Invitation not found.');
    }
    return {
        organizationName: organization.name,
        invitedEmail: invitation.invitedEmail,
        role: invitation.role
    };
}
/**
 * Callable-function orchestration: authenticate, validate, load.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleGetOrganizationInvitationPreview(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateGetOrganizationInvitationPreviewInput(data);
    return getOrganizationInvitationPreview(db, { email: context.auth.token?.email }, input);
}
