import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { EventMember, EventMemberSide, EventRole, MembershipStatus } from '@/types/membership';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { RepositoryConflictError, RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import { getEventMembershipId } from '@/repositories/membershipIds';
import {
  getOptionalString,
  getOptionalValidatedEnum,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const eventMembersCollection = 'eventMembers';

const validEventRoles = Object.values(EventRole) as readonly EventMember['role'][];
const validMembershipStatuses = Object.values(MembershipStatus) as readonly EventMember['status'][];
const validEventMemberSides = Object.values(EventMemberSide) as readonly EventMemberSide[];

const mapEventMemberToFirestore = (member: EventMember): Record<string, unknown> => ({
  id: member.id,
  eventId: member.eventId,
  userId: member.userId,
  role: member.role,
  side: member.side ?? null,
  status: member.status,
  invitedBy: member.invitedBy,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt
});

const mapFirestoreToEventMember = (memberId: string, data: Record<string, unknown>): EventMember => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid event member document.');
  }

  return {
    id: memberId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    userId: getRequiredString(data.userId, 'userId'),
    role: getValidatedEnum(data.role, 'role', validEventRoles),
    side: getOptionalValidatedEnum(data.side, 'side', validEventMemberSides),
    status: getValidatedEnum(data.status, 'status', validMembershipStatuses),
    invitedBy: getOptionalString(data.invitedBy),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

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
    const createdId = getEventMembershipId(member.eventId, member.userId);
    const ref = doc(this.collectionPath, createdId);
    const createdMember: EventMember = {
      ...member,
      id: createdId
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        const existingMember = await transaction.get(ref);
        if (existingMember.exists()) {
          throw new RepositoryConflictError('Event membership already exists.');
        }

        transaction.set(ref, mapEventMemberToFirestore(createdMember));
      });
      return createdMember;
    } catch (error) {
      if (error instanceof RepositoryConflictError) {
        throw error;
      }
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
