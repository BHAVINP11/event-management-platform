import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { OrganizationInvitation } from '@/types/organizationInvitation';
import { InvitationStatus } from '@/types/invitation';
import { OrganizationRole } from '@/types/membership';
import { OrganizationInvitationRepository } from '@/repositories/interfaces/organizationInvitationRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import { getRequiredString, getValidatedEnum } from '@/services/firebase/repositories/firestoreMapping';

const organizationInvitationsCollection = 'organizationInvitations';

const validOrganizationRoles = Object.values(OrganizationRole) as readonly OrganizationInvitation['role'][];
const validInvitationStatuses = Object.values(InvitationStatus) as readonly OrganizationInvitation['status'][];

const mapOrganizationInvitationToFirestore = (invitation: OrganizationInvitation): Record<string, unknown> => ({
  id: invitation.id,
  organizationId: invitation.organizationId,
  invitedEmail: invitation.invitedEmail,
  role: invitation.role,
  status: invitation.status,
  invitedBy: invitation.invitedBy,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
  updatedAt: invitation.updatedAt
});

const mapFirestoreToOrganizationInvitation = (
  invitationId: string,
  data: Record<string, unknown>
): OrganizationInvitation => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid organization invitation document.');
  }

  return {
    id: invitationId,
    organizationId: getRequiredString(data.organizationId, 'organizationId'),
    invitedEmail: getRequiredString(data.invitedEmail, 'invitedEmail'),
    role: getValidatedEnum(data.role, 'role', validOrganizationRoles),
    status: getValidatedEnum(data.status, 'status', validInvitationStatuses),
    invitedBy: getRequiredString(data.invitedBy, 'invitedBy'),
    expiresAt: getRequiredString(data.expiresAt, 'expiresAt'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed OrganizationInvitationRepository.
 *
 * `create`/`update` exist for interface completeness (matching the other
 * repositories) but are never called by application code — Firestore
 * rules deny all client writes to `organizationInvitations`; the trusted
 * Cloud Functions (createOrganizationInvitation, acceptOrganizationInvitation,
 * cancelOrganizationInvitation, resendOrganizationInvitation) are the only
 * writers.
 */
export class FirebaseOrganizationInvitationRepository implements OrganizationInvitationRepository {
  private collectionPath = collection(firestore, organizationInvitationsCollection);

  async getById(invitationId: string): Promise<OrganizationInvitation | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, invitationId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToOrganizationInvitation(invitationId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load organization invitation.');
    }
  }

  async create(invitation: Omit<OrganizationInvitation, 'id'>): Promise<OrganizationInvitation> {
    try {
      const ref = doc(this.collectionPath);
      const createdInvitation: OrganizationInvitation = { ...invitation, id: ref.id };
      await setDoc(ref, mapOrganizationInvitationToFirestore(createdInvitation));
      return createdInvitation;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create organization invitation.');
    }
  }

  async update(invitation: OrganizationInvitation): Promise<OrganizationInvitation> {
    try {
      const ref = doc(this.collectionPath, invitation.id);
      await updateDoc(ref, mapOrganizationInvitationToFirestore(invitation));
      return invitation;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update organization invitation.');
    }
  }

  async listByOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    try {
      const q = query(this.collectionPath, where('organizationId', '==', organizationId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) =>
        mapFirestoreToOrganizationInvitation(docSnapshot.id, docSnapshot.data())
      );
    } catch {
      throw new RepositoryInfrastructureError('Failed to list organization invitations.');
    }
  }
}
