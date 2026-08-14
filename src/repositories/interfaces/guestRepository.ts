import { Guest, GuestSide } from '@/types/guest';

export interface GuestRepository {
  getById(guestId: string): Promise<Guest | null>;
  create(guest: Omit<Guest, 'id'>): Promise<Guest>;
  update(guest: Guest): Promise<Guest>;
  delete(guestId: string): Promise<void>;
  listByEvent(eventId: string): Promise<Guest[]>;
  listByEventAndSide(eventId: string, side: GuestSide): Promise<Guest[]>;
}
