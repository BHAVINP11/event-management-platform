import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Guest, GuestSide, GuestStatus } from '@/types/guest';
import { GuestRepository } from '@/repositories/interfaces/guestRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getOptionalString,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const guestsCollection = 'guests';

const validGuestSides = Object.values(GuestSide) as readonly Guest['side'][];
const validGuestStatuses = Object.values(GuestStatus) as readonly Guest['status'][];

const mapGuestToFirestore = (guest: Guest): Record<string, unknown> => ({
  id: guest.id,
  eventId: guest.eventId,
  name: guest.name,
  phone: guest.phone,
  email: guest.email,
  side: guest.side,
  relation: guest.relation,
  notes: guest.notes,
  status: guest.status,
  createdBy: guest.createdBy,
  createdAt: guest.createdAt,
  updatedAt: guest.updatedAt
});

const mapFirestoreToGuest = (guestId: string, data: Record<string, unknown>): Guest => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid guest document.');
  }

  return {
    id: guestId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    name: getRequiredString(data.name, 'name'),
    phone: getOptionalString(data.phone),
    email: getOptionalString(data.email),
    side: getValidatedEnum(data.side, 'side', validGuestSides),
    relation: getOptionalString(data.relation),
    notes: getOptionalString(data.notes),
    status: getValidatedEnum(data.status, 'status', validGuestStatuses),
    createdBy: getRequiredString(data.createdBy, 'createdBy'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed GuestRepository. `guests/{guestId}` — a flat top-level
 * collection, not an `events/{eventId}/guests` subcollection, matching how
 * eventMembers/invitations are also flat collections scoped by an `eventId`
 * field rather than document nesting.
 *
 * `create`/`update`/`delete` exist for interface completeness (matching the
 * other repositories) but are never called by application code — Firestore
 * rules deny all client writes to `guests`; the trusted Cloud Functions
 * (createGuest, updateGuest, deleteGuest) are the only writers.
 */
export class FirebaseGuestRepository implements GuestRepository {
  private collectionPath = collection(firestore, guestsCollection);

  async getById(guestId: string): Promise<Guest | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, guestId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToGuest(guestId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load guest.');
    }
  }

  async create(guest: Omit<Guest, 'id'>): Promise<Guest> {
    try {
      const ref = doc(this.collectionPath);
      const createdGuest: Guest = { ...guest, id: ref.id };
      await setDoc(ref, mapGuestToFirestore(createdGuest));
      return createdGuest;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create guest.');
    }
  }

  async update(guest: Guest): Promise<Guest> {
    try {
      const ref = doc(this.collectionPath, guest.id);
      await updateDoc(ref, mapGuestToFirestore(guest));
      return guest;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update guest.');
    }
  }

  async delete(guestId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, guestId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete guest.');
    }
  }

  async listByEvent(eventId: string): Promise<Guest[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToGuest(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list guests.');
    }
  }

  async listByEventAndSide(eventId: string, side: GuestSide): Promise<Guest[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId), where('side', '==', side));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToGuest(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list guests.');
    }
  }
}
