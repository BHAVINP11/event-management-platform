"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateInvitationInput = validateCreateInvitationInput;
exports.assertNoDuplicatePendingInvitation = assertNoDuplicatePendingInvitation;
exports.createInvitation = createInvitation;
exports.handleCreateInvitation = handleCreateInvitation;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
/** How long a new invitation remains acceptable. Not client-configurable. */
const INVITATION_EXPIRY_DAYS = 14;
function validateCreateInvitationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateInvitationFields)(obj);
    return { eventId: obj.eventId, ...fields };
}
/**
 * Rejects a second pending invitation for the same event + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
async function assertNoDuplicatePendingInvitation(db, eventId, invitedEmail) {
    const snapshot = await db
        .collection('invitations')
        .where('eventId', '==', eventId)
        .where('invitedEmail', '==', invitedEmail)
        .where('status', '==', 'pending')
        .get();
    if (!snapshot.empty) {
        throw new validation_1.ValidationError('invitation_already_pending', 'There is already a pending invitation for this email.');
    }
}
/**
 * Creates a pending invitation after verifying the caller's authority over
 * the event and that no duplicate pending invitation already exists.
 *
 * Does not create an EventMember — that only happens on acceptance.
 */
async function createInvitation(db, auth, input) {
    const userId = auth.uid;
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, userId);
    await assertNoDuplicatePendingInvitation(db, input.eventId, input.invitedEmail);
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const invitationRef = db.collection('invitations').doc();
    const invitationId = invitationRef.id;
    await invitationRef.set((0, shared_1.buildInvitationDocument)(invitationId, input.eventId, userId, input, nowIso, expiresAt));
    return { invitationId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleCreateInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateInvitationInput(data);
    return createInvitation(db, { uid: context.auth.uid }, input);
}
