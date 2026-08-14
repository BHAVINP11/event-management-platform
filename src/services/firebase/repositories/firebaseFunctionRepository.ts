import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';
import { FunctionRepository } from '@/repositories/interfaces/functionRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getOptionalString,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const functionsCollection = 'functions';

const validStatuses = Object.values(EventFunctionStatus) as readonly EventFunction['status'][];

const mapFunctionToFirestore = (fn: EventFunction): Record<string, unknown> => ({
  id: fn.id,
  eventId: fn.eventId,
  name: fn.name,
  description: fn.description,
  date: fn.date,
  startTime: fn.startTime,
  endTime: fn.endTime,
  venue: fn.venue,
  notes: fn.notes,
  status: fn.status,
  createdBy: fn.createdBy,
  createdAt: fn.createdAt,
  updatedAt: fn.updatedAt
});

const mapFirestoreToFunction = (functionId: string, data: Record<string, unknown>): EventFunction => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid function document.');
  }

  return {
    id: functionId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    name: getRequiredString(data.name, 'name'),
    description: getOptionalString(data.description),
    date: getOptionalString(data.date),
    startTime: getOptionalString(data.startTime),
    endTime: getOptionalString(data.endTime),
    venue: getOptionalString(data.venue),
    notes: getOptionalString(data.notes),
    status: getValidatedEnum(data.status, 'status', validStatuses),
    createdBy: getRequiredString(data.createdBy, 'createdBy'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed FunctionRepository. `functions/{functionId}` — a flat
 * top-level collection carrying an `eventId` field, matching guests/
 * invitations/eventMembers rather than an `events/{eventId}/functions`
 * subcollection.
 *
 * `create`/`update`/`delete` exist for interface completeness (matching the
 * other repositories) but are never called by application code — Firestore
 * rules deny all client writes to `functions`; the trusted Cloud Functions
 * (createFunction, updateFunction, deleteFunction) are the only writers.
 */
export class FirebaseFunctionRepository implements FunctionRepository {
  private collectionPath = collection(firestore, functionsCollection);

  async getById(functionId: string): Promise<EventFunction | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, functionId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToFunction(functionId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load function.');
    }
  }

  async create(fn: Omit<EventFunction, 'id'>): Promise<EventFunction> {
    try {
      const ref = doc(this.collectionPath);
      const created: EventFunction = { ...fn, id: ref.id };
      await setDoc(ref, mapFunctionToFirestore(created));
      return created;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create function.');
    }
  }

  async update(fn: EventFunction): Promise<EventFunction> {
    try {
      const ref = doc(this.collectionPath, fn.id);
      await updateDoc(ref, mapFunctionToFirestore(fn));
      return fn;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update function.');
    }
  }

  async delete(functionId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, functionId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete function.');
    }
  }

  async listByEvent(eventId: string): Promise<EventFunction[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToFunction(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list functions.');
    }
  }
}
