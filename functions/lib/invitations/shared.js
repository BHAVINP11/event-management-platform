"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVITATION_SIDES = exports.INVITABLE_EVENT_ROLES = void 0;
exports.validateInvitationRole = validateInvitationRole;
exports.validateInvitationSide = validateInvitationSide;
exports.validateInvitationFields = validateInvitationFields;
exports.buildInvitationDocument = buildInvitationDocument;
/**
 * Shared building blocks for event invitations.
 *
 * createInvitation and acceptInvitation both need the same role/side vocabulary
 * and produce/consume the same Invitation document shape, so validation and
 * document building live here once rather than in each function.
 */
const validation_1 = require("../validation");
/**
 * Invitable event roles. `owner` is deliberately excluded — inviting someone
 * as owner is not allowed (there is exactly one owner, the event creator).
 */
exports.INVITABLE_EVENT_ROLES = ['couple', 'family', 'planner', 'staff', 'viewer'];
/** Roles for which a side (bride/groom) is a meaningful, allowed value. */
const SIDE_ALLOWED_ROLES = ['couple', 'family'];
exports.INVITATION_SIDES = ['bride', 'groom'];
/** Validates the role. Throws ValidationError('invalid_role') if not invitable. */
function validateInvitationRole(role) {
    if (!role || typeof role !== 'string' || !exports.INVITABLE_EVENT_ROLES.includes(role)) {
        throw new validation_1.ValidationError('invalid_role', `Role must be one of: ${exports.INVITABLE_EVENT_ROLES.join(', ')}`);
    }
    return role;
}
/**
 * Validates the side against the already-validated role.
 *
 * - couple / family: side may be omitted, or must be bride/groom.
 * - planner / staff / viewer: side must be omitted.
 */
function validateInvitationSide(side, role) {
    if (side === undefined || side === null) {
        return undefined;
    }
    if (!SIDE_ALLOWED_ROLES.includes(role)) {
        throw new validation_1.ValidationError('invalid_side', `Side is not applicable to role "${role}".`);
    }
    if (typeof side !== 'string' || !exports.INVITATION_SIDES.includes(side)) {
        throw new validation_1.ValidationError('invalid_side', `Side must be one of: ${exports.INVITATION_SIDES.join(', ')}`);
    }
    return side;
}
/** Validates the fields common to invitation creation. Throws ValidationError. */
function validateInvitationFields(obj) {
    const invitedEmail = (0, validation_1.validateRequiredEmail)(obj.invitedEmail);
    const role = validateInvitationRole(obj.role);
    const side = validateInvitationSide(obj.side, role);
    return { invitedEmail, role, side };
}
/** Deterministic-free invitation ID is just the auto-generated Firestore doc ID. */
function buildInvitationDocument(invitationId, eventId, invitedBy, fields, now, expiresAt) {
    return {
        id: invitationId,
        eventId,
        invitedEmail: fields.invitedEmail,
        role: fields.role,
        side: fields.side ?? null,
        status: 'pending',
        invitedBy,
        expiresAt,
        createdAt: now,
        updatedAt: now
    };
}
