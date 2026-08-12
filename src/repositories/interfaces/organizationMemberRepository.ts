import { OrganizationMember } from '@/types/membership';

export interface OrganizationMemberRepository {
  getById(memberId: string): Promise<OrganizationMember | null>;
  create(member: Omit<OrganizationMember, 'id'>): Promise<OrganizationMember>;
  update(member: OrganizationMember): Promise<OrganizationMember>;
  delete(memberId: string): Promise<void>;
  listByOrganization(organizationId: string): Promise<OrganizationMember[]>;
  listByUser(userId: string): Promise<OrganizationMember[]>;
}
