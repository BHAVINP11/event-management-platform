import { OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';

/**
 * A pending (or resolved) invitation to join an organization. A
 * deliberately separate type from `Invitation` (event invitations) —
 * organization and event invitations are conceptually independent
 * relationships, matching how `organizationMembers`/`eventMembers` are
 * already independent collections. `InvitationStatus` is reused as-is:
 * it's a generic pending/accepted/expired/cancelled lifecycle vocabulary,
 * not something specific to events.
 */
export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  invitedEmail: string;
  role: OrganizationRole;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
