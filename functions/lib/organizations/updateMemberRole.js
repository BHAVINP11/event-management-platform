"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateOrganizationMemberRoleInput = validateUpdateOrganizationMemberRoleInput;
exports.updateOrganizationMemberRole = updateOrganizationMemberRole;
exports.handleUpdateOrganizationMemberRole = handleUpdateOrganizationMemberRole;
const validation_1 = require("../validation");
const organizationAuthority_1 = require("../shared/organizationAuthority");
const membershipIds_1 = require("../shared/membershipIds");
const shared_1 = require("./shared");
function validateUpdateOrganizationMemberRoleInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.organizationId || typeof obj.organizationId !== 'string') {
        throw new validation_1.ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
    }
    if (!obj.userId || typeof obj.userId !== 'string') {
        throw new validation_1.ValidationError('invalid_user_id', 'userId must be a non-empty string.');
    }
    const role = (0, shared_1.validateOrganizationInvitationRole)(obj.role);
    return { organizationId: obj.organizationId, userId: obj.userId, role };
}
/**
 * Changes a member's role. The caller must have an active
 * OrganizationMember with role owner or admin. Reuses the exact role
 * vocabulary `createOrganizationInvitation` already established
 * (`INVITABLE_ORGANIZATION_ROLES` excludes `owner`, so a member can never
 * be promoted *to* owner this way) rather than duplicating it. The
 * organization owner's own role can never be changed here — ownership
 * transfer is a separate, larger decision this pass deliberately does
 * not implement (see `removeOrganizationMember` for the same reasoning
 * on why this alone is sufficient to guarantee the organization always
 * keeps a manager).
 */
async function updateOrganizationMemberRole(db, auth, input) {
    await (0, organizationAuthority_1.verifyOrganizationManagementAuthority)(db, input.organizationId, auth.uid);
    const membershipId = (0, membershipIds_1.getOrganizationMembershipId)(input.organizationId, input.userId);
    const membershipRef = db.collection('organizationMembers').doc(membershipId);
    const snapshot = await membershipRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing) {
        throw new validation_1.ValidationError('organization_member_not_found', 'This member could not be found.');
    }
    if (existing.role === 'owner') {
        throw new validation_1.ValidationError('organization_owner_role_immutable', "The organization owner's role cannot be changed.");
    }
    const now = new Date().toISOString();
    await membershipRef.update({ role: input.role, updatedAt: now });
    return { organizationId: input.organizationId, userId: input.userId, role: input.role };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
async function handleUpdateOrganizationMemberRole(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateOrganizationMemberRoleInput(data);
    return updateOrganizationMemberRole(db, { uid: context.auth.uid }, input);
}
