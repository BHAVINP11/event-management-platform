import { OrganizationRole } from '@/types/membership';

export interface OrganizationDetailView {
  id: string;
  name: string;
  slug: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  role: OrganizationRole;
  /** Whether the current user may edit organization details / manage members (owner/admin). */
  canManage: boolean;
}

export type OrganizationAccessResult =
  | { status: 'allowed'; organization: OrganizationDetailView }
  | { status: 'denied' }
  | { status: 'notFound' };
