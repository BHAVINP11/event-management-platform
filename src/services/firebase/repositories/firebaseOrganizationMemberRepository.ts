import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { OrganizationMember, OrganizationRole, MembershipStatus } from '@/types/membership';
import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { RepositoryConflictError, RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import { getOrganizationMembershipId } from '@/repositories/membershipIds';
import { getRequiredString, getValidatedEnum } from '@/services/firebase/repositories/firestoreMapping';

const organizationMembersCollection = 'organizationMembers';

const validOrganizationRoles = Object.values(OrganizationRole) as readonly OrganizationMember['role'][];
const validMembershipStatuses = Object.values(MembershipStatus) as readonly OrganizationMember['status'][];

const mapOrganizationMemberToFirestore = (member: OrganizationMember): Record<string, unknown> => ({
  id: member.id,
  organizationId: member.organizationId,
  userId: member.userId,
  role: member.role,
  status: member.status,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt
});

const mapFirestoreToOrganizationMember = (memberId: string, data: Record<string, unknown>): OrganizationMember => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid organization member document.');
  }

  return {
    id: memberId,
    organizationId: getRequiredString(data.organizationId, 'organizationId'),
    userId: getRequiredString(data.userId, 'userId'),
    role: getValidatedEnum(data.role, 'role', validOrganizationRoles),
    status: getValidatedEnum(data.status, 'status', validMembershipStatuses),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

export class FirebaseOrganizationMemberRepository implements OrganizationMemberRepository {
  private collectionPath = collection(firestore, organizationMembersCollection);

  async getById(memberId: string): Promise<OrganizationMember | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, memberId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToOrganizationMember(memberId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load organization member.');
    }
  }

  async create(member: Omit<OrganizationMember, 'id'>): Promise<OrganizationMember> {
    const createdId = getOrganizationMembershipId(member.organizationId, member.userId);
    const ref = doc(this.collectionPath, createdId);
    const createdMember: OrganizationMember = {
      ...member,
      id: createdId
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        const existingMember = await transaction.get(ref);
        if (existingMember.exists()) {
          throw new RepositoryConflictError('Organization membership already exists.');
        }

        transaction.set(ref, mapOrganizationMemberToFirestore(createdMember));
      });
      return createdMember;
    } catch (error) {
      if (error instanceof RepositoryConflictError) {
        throw error;
      }
      throw new RepositoryInfrastructureError('Failed to create organization member.');
    }
  }

  async update(member: OrganizationMember): Promise<OrganizationMember> {
    try {
      const ref = doc(this.collectionPath, member.id);
      await updateDoc(ref, mapOrganizationMemberToFirestore(member));
      return member;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update organization member.');
    }
  }

  async delete(memberId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, memberId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete organization member.');
    }
  }

  async listByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    try {
      const q = query(this.collectionPath, where('organizationId', '==', organizationId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToOrganizationMember(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list organization members.');
    }
  }

  async listByUser(userId: string): Promise<OrganizationMember[]> {
    try {
      const q = query(this.collectionPath, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToOrganizationMember(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list organization members.');
    }
  }
}
