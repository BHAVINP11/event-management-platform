"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVITABLE_ORGANIZATION_ROLES = void 0;
exports.validateOrganizationInvitationRole = validateOrganizationInvitationRole;
exports.validateOrganizationInvitationFields = validateOrganizationInvitationFields;
exports.buildOrganizationInvitationDocument = buildOrganizationInvitationDocument;
/**
 * Shared building blocks for organization invitations.
 *
 * A deliberate, separate parallel to `functions/src/invitations/shared.ts`
 * (event invitations) rather than a reuse of it — organization invitations
 * and event invitations are conceptually different relationships (no
 * `side` concept, a different role vocabulary, a different collection),
 * and the task that introduced this domain explicitly required the two
 * stay independent rather than being forced into one shared shape.
 */
const validation_1 = require("../validation");
/**
 * Invitable organization roles. `owner` is deliberately excluded — there
 * is exactly one owner (the organization's creator), matching how
 * `INVITABLE_EVENT_ROLES` excludes `owner` for the same reason.
 */
exports.INVITABLE_ORGANIZATION_ROLES = ['admin', 'planner', 'staff'];
/** Validates the role. Throws ValidationError('invalid_role') if not invitable. */
function validateOrganizationInvitationRole(role) {
    if (!role ||
        typeof role !== 'string' ||
        !exports.INVITABLE_ORGANIZATION_ROLES.includes(role)) {
        throw new validation_1.ValidationError('invalid_role', `Role must be one of: ${exports.INVITABLE_ORGANIZATION_ROLES.join(', ')}`);
    }
    return role;
}
/** Validates the fields common to organization invitation creation. Throws ValidationError. */
function validateOrganizationInvitationFields(obj) {
    const invitedEmail = (0, validation_1.validateRequiredEmail)(obj.invitedEmail);
    const role = validateOrganizationInvitationRole(obj.role);
    return { invitedEmail, role };
}
/** Deterministic-free invitation ID is just the auto-generated Firestore doc ID. */
function buildOrganizationInvitationDocument(invitationId, organizationId, invitedBy, fields, now, expiresAt) {
    return {
        id: invitationId,
        organizationId,
        invitedEmail: fields.invitedEmail,
        role: fields.role,
        status: 'pending',
        invitedBy,
        expiresAt,
        createdAt: now,
        updatedAt: now
    };
}
