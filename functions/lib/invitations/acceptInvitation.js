"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAcceptInvitationInput = validateAcceptInvitationInput;
exports.loadAcceptableInvitation = loadAcceptableInvitation;
exports.assertInvitationBelongsToCaller = assertInvitationBelongsToCaller;
exports.acceptInvitation = acceptInvitation;
exports.handleAcceptInvitation = handleAcceptInvitation;
const validation_1 = require("../validation");
const membershipIds_1 = require("../shared/membershipIds");
const normalizeEmail = (email) => email.trim().toLowerCase();
function validateAcceptInvitationInput(input) {
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
 * Loads an invitation and checks it is acceptable: exists, pending, not
 * expired. Shared by acceptInvitation and getInvitationPreview so the two
 * can never disagree about what "acceptable" means.
 *
 * @throws ValidationError('invitation_not_found')
 * @throws ValidationError('invitation_not_pending')
 * @throws ValidationError('invitation_expired')
 */
async function loadAcceptableInvitation(db, invitationId) {
    const ref = db.collection('invitations').doc(invitationId);
    const snapshot = await ref.get();
    const data = snapshot.data();
    if (!snapshot.exists || !data || !data.eventId || !data.invitedEmail || !data.role) {
        throw new validation_1.ValidationError('invitation_not_found', 'Invitation not found.');
    }
    if (data.status !== 'pending') {
        throw new validation_1.ValidationError('invitation_not_pending', 'This invitation is no longer pending.');
    }
    if (!data.expiresAt || new Date(data.expiresAt).getTime() < Date.now()) {
        throw new validation_1.ValidationError('invitation_expired', 'This invitation has expired.');
    }
    return { ref, data: data };
}
/**
 * Verifies the authenticated caller is the person the invitation was sent
 * to. Comparison is case-insensitive since the invited email was normalized
 * to lowercase at creation time.
 *
 * @throws ValidationError('invitation_email_mismatch')
 */
function assertInvitationBelongsToCaller(invitedEmail, callerEmail) {
    if (!callerEmail || normalizeEmail(callerEmail) !== normalizeEmail(invitedEmail)) {
        throw new validation_1.ValidationError('invitation_email_mismatch', 'This invitation was sent to a different email address.');
    }
}
/**
 * Accepts an invitation: verifies it, creates the deterministic EventMember
 * (or reactivates one belonging to the same event+user), and marks the
 * invitation accepted — atomically.
 *
 * If an active membership already exists for this event+user (e.g. a race
 * between two acceptances of the same invitation), it is left untouched
 * rather than overwritten; only the invitation is marked accepted.
 */
async function acceptInvitation(db, auth, input) {
    const userId = auth.uid;
    const { ref: invitationRef, data: invitation } = await loadAcceptableInvitation(db, input.invitationId);
    assertInvitationBelongsToCaller(invitation.invitedEmail, auth.email);
    const membershipId = (0, membershipIds_1.getEventMembershipId)(invitation.eventId, userId);
    const membershipRef = db.collection('eventMembers').doc(membershipId);
    const existingMembershipSnapshot = await membershipRef.get();
    const existingMembership = existingMembershipSnapshot.data();
    const now = new Date().toISOString();
    if (existingMembershipSnapshot.exists && existingMembership?.status === 'active') {
        // Already an active member — do not overwrite. Just record acceptance.
        await invitationRef.update({ status: 'accepted', updatedAt: now });
        return { eventId: invitation.eventId, membershipId };
    }
    const batch = db.batch();
    batch.set(membershipRef, {
        id: membershipId,
        eventId: invitation.eventId,
        userId,
        role: invitation.role,
        side: invitation.side ?? null,
        status: 'active',
        invitedBy: invitation.invitedBy ?? null,
        createdAt: now,
        updatedAt: now
    });
    batch.update(invitationRef, { status: 'accepted', updatedAt: now });
    await batch.commit();
    return { eventId: invitation.eventId, membershipId };
}
/**
 * Callable-function orchestration: authenticate, validate, accept.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleAcceptInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateAcceptInvitationInput(data);
    return acceptInvitation(db, { uid: context.auth.uid, email: context.auth.token?.email }, input);
}
