"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZATION_INVITATION_EXPIRY_DAYS = void 0;
exports.validateCreateOrganizationInvitationInput = validateCreateOrganizationInvitationInput;
exports.assertNoDuplicatePendingOrganizationInvitation = assertNoDuplicatePendingOrganizationInvitation;
exports.createOrganizationInvitation = createOrganizationInvitation;
exports.handleCreateOrganizationInvitation = handleCreateOrganizationInvitation;
const validation_1 = require("../validation");
const organizationAuthority_1 = require("../shared/organizationAuthority");
const shared_1 = require("./shared");
/**
 * How long a new organization invitation remains acceptable. Not
 * client-configurable. A separate constant from
 * `functions/src/invitations/createInvitation.ts`'s
 * `INVITATION_EXPIRY_DAYS` — organization and event invitations are
 * deliberately independent lifecycles, even though the value happens to
 * match today.
 */
exports.ORGANIZATION_INVITATION_EXPIRY_DAYS = 14;
function validateCreateOrganizationInvitationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.organizationId || typeof obj.organizationId !== 'string') {
        throw new validation_1.ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateOrganizationInvitationFields)(obj);
    return { organizationId: obj.organizationId, ...fields };
}
/**
 * Rejects a second pending invitation for the same organization + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
async function assertNoDuplicatePendingOrganizationInvitation(db, organizationId, invitedEmail) {
    const snapshot = await db
        .collection('organizationInvitations')
        .where('organizationId', '==', organizationId)
        .where('invitedEmail', '==', invitedEmail)
        .where('status', '==', 'pending')
        .get();
    if (!snapshot.empty) {
        throw new validation_1.ValidationError('invitation_already_pending', 'There is already a pending invitation for this email.');
    }
}
/**
 * Creates a pending organization invitation after verifying the caller's
 * authority over the organization and that no duplicate pending
 * invitation already exists.
 *
 * Does not create an OrganizationMember — that only happens on
 * acceptance, matching the event-invitation domain exactly.
 */
async function createOrganizationInvitation(db, auth, input) {
    const userId = auth.uid;
    await (0, organizationAuthority_1.verifyOrganizationManagementAuthority)(db, input.organizationId, userId);
    await assertNoDuplicatePendingOrganizationInvitation(db, input.organizationId, input.invitedEmail);
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + exports.ORGANIZATION_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const invitationRef = db.collection('organizationInvitations').doc();
    const invitationId = invitationRef.id;
    await invitationRef.set((0, shared_1.buildOrganizationInvitationDocument)(invitationId, input.organizationId, userId, input, nowIso, expiresAt));
    return { invitationId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleCreateOrganizationInvitation(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateOrganizationInvitationInput(data);
    return createOrganizationInvitation(db, { uid: context.auth.uid }, input);
}
