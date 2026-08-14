import { Invitation } from '@/types/invitation';

export interface InvitationRepository {
  getById(invitationId: string): Promise<Invitation | null>;
  create(invitation: Omit<Invitation, 'id'>): Promise<Invitation>;
  update(invitation: Invitation): Promise<Invitation>;
  listByEvent(eventId: string): Promise<Invitation[]>;
  listPendingByEmail(email: string): Promise<Invitation[]>;
}
