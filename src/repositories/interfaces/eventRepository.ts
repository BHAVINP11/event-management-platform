import { Event } from '@/types/event';

export interface EventRepository {
  getById(eventId: string): Promise<Event | null>;
  create(event: Omit<Event, 'id'>): Promise<Event>;
  update(event: Event): Promise<Event>;
}
