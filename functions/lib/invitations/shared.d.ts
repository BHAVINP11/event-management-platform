/**
 * Invitable event roles. `owner` is deliberately excluded — inviting someone
 * as owner is not allowed (there is exactly one owner, the event creator).
 */
export declare const INVITABLE_EVENT_ROLES: readonly ["couple", "family", "planner", "staff", "viewer"];
export declare const INVITATION_SIDES: readonly ["bride", "groom"];
export interface CreateInvitationFields {
    invitedEmail: string;
    role: string;
    side?: string;
}
/** Validates the role. Throws ValidationError('invalid_role') if not invitable. */
export declare function validateInvitationRole(role: unknown): string;
/**
 * Validates the side against the already-validated role.
 *
 * - couple / family: side may be omitted, or must be bride/groom.
 * - planner / staff / viewer: side must be omitted.
 */
export declare function validateInvitationSide(side: unknown, role: string): string | undefined;
/** Validates the fields common to invitation creation. Throws ValidationError. */
export declare function validateInvitationFields(obj: Record<string, unknown>): CreateInvitationFields;
/** Deterministic-free invitation ID is just the auto-generated Firestore doc ID. */
export declare function buildInvitationDocument(invitationId: string, eventId: string, invitedBy: string, fields: CreateInvitationFields, now: string, expiresAt: string): Record<string, unknown>;
