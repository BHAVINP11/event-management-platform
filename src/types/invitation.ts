import { EventMemberSide, EventRole } from '@/types/membership';

export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Expired = 'expired',
  Cancelled = 'cancelled'
}

/**
 * A pending (or resolved) invitation to join an event. Creating an
 * Invitation never grants access by itself — only an active EventMember
 * does, and that is only created on acceptance.
 */
export interface Invitation {
  id: string;
  eventId: string;
  invitedEmail: string;
  invitedPhone?: string;
  role: EventRole;
  side?: EventMemberSide;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
