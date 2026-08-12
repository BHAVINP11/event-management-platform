import { Organization } from '@/types/organization';

export interface OrganizationRepository {
  getById(organizationId: string): Promise<Organization | null>;
  create(organization: Omit<Organization, 'id'>): Promise<Organization>;
  update(organization: Organization): Promise<Organization>;
}
