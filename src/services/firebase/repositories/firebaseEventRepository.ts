import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Event, EventType, EventStatus } from '@/types/event';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getNullableString,
  getOptionalNumber,
  getOptionalString,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const eventsCollection = 'events';

const validEventTypes = Object.values(EventType) as readonly Event['type'][];
const validEventStatuses = Object.values(EventStatus) as readonly Event['status'][];

const mapEventToFirestore = (event: Event): Record<string, unknown> => ({
  id: event.id,
  name: event.name,
  type: event.type,
  description: event.description,
  startDate: event.startDate,
  endDate: event.endDate,
  timezone: event.timezone,
  venueName: event.venueName,
  venueAddress: event.venueAddress,
  budgetAmount: event.budgetAmount,
  organizationId: event.organizationId,
  createdBy: event.createdBy,
  status: event.status,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt
});

const mapFirestoreToEvent = (eventId: string, data: Record<string, unknown>): Event => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid event document.');
  }

  return {
    id: eventId,
    name: getRequiredString(data.name, 'name'),
    type: getValidatedEnum(data.type, 'type', validEventTypes),
    description: getOptionalString(data.description),
    startDate: getOptionalString(data.startDate),
    endDate: getOptionalString(data.endDate),
    timezone: getOptionalString(data.timezone),
    venueName: getOptionalString(data.venueName),
    venueAddress: getOptionalString(data.venueAddress),
    budgetAmount: getOptionalNumber(data.budgetAmount),
    organizationId: getNullableString(data.organizationId),
    createdBy: getRequiredString(data.createdBy, 'createdBy'),
    status: getValidatedEnum(data.status, 'status', validEventStatuses),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

export class FirebaseEventRepository implements EventRepository {
  private collectionPath = collection(firestore, eventsCollection);

  async getById(eventId: string): Promise<Event | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, eventId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToEvent(eventId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load event.');
    }
  }

  async create(event: Omit<Event, 'id'>): Promise<Event> {
    try {
      const ref = doc(this.collectionPath);
      const createdId = ref.id;
      const createdEvent: Event = {
        ...event,
        id: createdId
      };
      await setDoc(ref, mapEventToFirestore(createdEvent));
      return createdEvent;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create event.');
    }
  }

  async update(event: Event): Promise<Event> {
    try {
      const ref = doc(this.collectionPath, event.id);
      await updateDoc(ref, mapEventToFirestore(event));
      return event;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update event.');
    }
  }
}
