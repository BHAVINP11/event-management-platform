import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { EventMember } from '@/types/membership';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { RepositoryInfrastructureError } from '@/repositories/errors';

const eventMembersCollection = 'eventMembers';

const mapEventMemberToFirestore = (member: EventMember): Record<string, unknown> => ({
  id: member.id,
  eventId: member.eventId,
  userId: member.userId,
  role: member.role,
  status: member.status,
  invitedBy: member.invitedBy,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt
});

const mapFirestoreToEventMember = (memberId: string, data: Record<string, unknown>): EventMember => ({
  id: memberId,
  eventId: String(data.eventId ?? ''),
  userId: String(data.userId ?? ''),
  role: String(data.role ?? '') as EventMember['role'],
  status: String(data.status ?? '') as EventMember['status'],
  invitedBy: typeof data.invitedBy === 'string' ? data.invitedBy : undefined,
  createdAt: String(data.createdAt ?? ''),
  updatedAt: String(data.updatedAt ?? '')
});

export class FirebaseEventMemberRepository implements EventMemberRepository {
  private collectionPath = collection(firestore, eventMembersCollection);

  async getById(memberId: string): Promise<EventMember | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, memberId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToEventMember(memberId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load event member.');
    }
  }

  async create(member: Omit<EventMember, 'id'>): Promise<EventMember> {
    try {
      const ref = doc(this.collectionPath);
      const createdId = ref.id;
      const createdMember: EventMember = {
        ...member,
        id: createdId
      };
      await setDoc(ref, mapEventMemberToFirestore(createdMember));
      return createdMember;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create event member.');
    }
  }

  async update(member: EventMember): Promise<EventMember> {
    try {
      const ref = doc(this.collectionPath, member.id);
      await updateDoc(ref, mapEventMemberToFirestore(member));
      return member;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update event member.');
    }
  }

  async delete(memberId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, memberId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete event member.');
    }
  }

  async listByEvent(eventId: string): Promise<EventMember[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToEventMember(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list event members.');
    }
  }

  async listByUser(userId: string): Promise<EventMember[]> {
    try {
      const q = query(this.collectionPath, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToEventMember(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list event members.');
    }
  }
}
