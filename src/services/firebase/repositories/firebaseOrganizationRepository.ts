import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Organization } from '@/types/organization';
import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { RepositoryInfrastructureError } from '@/repositories/errors';

const organizationsCollection = 'organizations';

const mapOrganizationToFirestore = (organization: Organization): Record<string, unknown> => ({
  id: organization.id,
  name: organization.name,
  slug: organization.slug,
  logoUrl: organization.logoUrl,
  description: organization.description,
  contactEmail: organization.contactEmail,
  contactPhone: organization.contactPhone,
  createdAt: organization.createdAt,
  updatedAt: organization.updatedAt
});

const mapFirestoreToOrganization = (organizationId: string, data: Record<string, unknown>): Organization => ({
  id: organizationId,
  name: String(data.name ?? ''),
  slug: String(data.slug ?? ''),
  logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : undefined,
  description: typeof data.description === 'string' ? data.description : undefined,
  contactEmail: String(data.contactEmail ?? ''),
  contactPhone: typeof data.contactPhone === 'string' ? data.contactPhone : undefined,
  createdAt: String(data.createdAt ?? ''),
  updatedAt: String(data.updatedAt ?? '')
});

export class FirebaseOrganizationRepository implements OrganizationRepository {
  private collectionPath = collection(firestore, organizationsCollection);

  async getById(organizationId: string): Promise<Organization | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, organizationId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToOrganization(organizationId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load organization.');
    }
  }

  async create(organization: Omit<Organization, 'id'>): Promise<Organization> {
    try {
      const ref = doc(this.collectionPath);
      const createdId = ref.id;
      const createdOrganization: Organization = {
        ...organization,
        id: createdId
      };
      await setDoc(ref, mapOrganizationToFirestore(createdOrganization));
      return createdOrganization;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create organization.');
    }
  }

  async update(organization: Organization): Promise<Organization> {
    try {
      const ref = doc(this.collectionPath, organization.id);
      await updateDoc(ref, mapOrganizationToFirestore(organization));
      return organization;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update organization.');
    }
  }
}
