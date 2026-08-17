/**
 * Invitable organization roles. `owner` is deliberately excluded — there
 * is exactly one owner (the organization's creator), matching how
 * `INVITABLE_EVENT_ROLES` excludes `owner` for the same reason.
 */
export declare const INVITABLE_ORGANIZATION_ROLES: readonly ["admin", "planner", "staff"];
export interface CreateOrganizationInvitationFields {
    invitedEmail: string;
    role: string;
}
/** Validates the role. Throws ValidationError('invalid_role') if not invitable. */
export declare function validateOrganizationInvitationRole(role: unknown): string;
/** Validates the fields common to organization invitation creation. Throws ValidationError. */
export declare function validateOrganizationInvitationFields(obj: Record<string, unknown>): CreateOrganizationInvitationFields;
/** Deterministic-free invitation ID is just the auto-generated Firestore doc ID. */
export declare function buildOrganizationInvitationDocument(invitationId: string, organizationId: string, invitedBy: string, fields: CreateOrganizationInvitationFields, now: string, expiresAt: string): Record<string, unknown>;
