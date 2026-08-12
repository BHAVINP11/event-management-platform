import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Event } from '@/types/event';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { RepositoryInfrastructureError } from '@/repositories/errors';

const eventsCollection = 'events';

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
  organizationId: event.organizationId,
  createdBy: event.createdBy,
  status: event.status,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt
});

const mapFirestoreToEvent = (eventId: string, data: Record<string, unknown>): Event => ({
  id: eventId,
  name: String(data.name ?? ''),
  type: String(data.type ?? 'other') as Event['type'],
  description: typeof data.description === 'string' ? data.description : undefined,
  startDate: typeof data.startDate === 'string' ? data.startDate : undefined,
  endDate: typeof data.endDate === 'string' ? data.endDate : undefined,
  timezone: typeof data.timezone === 'string' ? data.timezone : undefined,
  venueName: typeof data.venueName === 'string' ? data.venueName : undefined,
  venueAddress: typeof data.venueAddress === 'string' ? data.venueAddress : undefined,
  organizationId: data.organizationId === null ? null : typeof data.organizationId === 'string' ? data.organizationId : undefined,
  createdBy: String(data.createdBy ?? ''),
  status: String(data.status ?? 'draft') as Event['status'],
  createdAt: String(data.createdAt ?? ''),
  updatedAt: String(data.updatedAt ?? '')
});

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
