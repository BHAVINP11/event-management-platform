import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { OrganizationMember } from '@/types/membership';
import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { RepositoryInfrastructureError } from '@/repositories/errors';

const organizationMembersCollection = 'organizationMembers';

const mapOrganizationMemberToFirestore = (member: OrganizationMember): Record<string, unknown> => ({
  id: member.id,
  organizationId: member.organizationId,
  userId: member.userId,
  role: member.role,
  status: member.status,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt
});

const mapFirestoreToOrganizationMember = (memberId: string, data: Record<string, unknown>): OrganizationMember => ({
  id: memberId,
  organizationId: String(data.organizationId ?? ''),
  userId: String(data.userId ?? ''),
  role: String(data.role ?? '') as OrganizationMember['role'],
  status: String(data.status ?? '') as OrganizationMember['status'],
  createdAt: String(data.createdAt ?? ''),
  updatedAt: String(data.updatedAt ?? '')
});

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
    try {
      const ref = doc(this.collectionPath);
      const createdId = ref.id;
      const createdMember: OrganizationMember = {
        ...member,
        id: createdId
      };
      await setDoc(ref, mapOrganizationMemberToFirestore(createdMember));
      return createdMember;
    } catch {
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
