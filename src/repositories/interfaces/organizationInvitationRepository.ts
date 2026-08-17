import { OrganizationInvitation } from '@/types/organizationInvitation';

export interface OrganizationInvitationRepository {
  getById(invitationId: string): Promise<OrganizationInvitation | null>;
  create(invitation: Omit<OrganizationInvitation, 'id'>): Promise<OrganizationInvitation>;
  update(invitation: OrganizationInvitation): Promise<OrganizationInvitation>;
  listByOrganization(organizationId: string): Promise<OrganizationInvitation[]>;
}
