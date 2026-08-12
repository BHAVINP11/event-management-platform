import { EventMember } from '@/types/membership';

export interface EventMemberRepository {
  getById(memberId: string): Promise<EventMember | null>;
  create(member: Omit<EventMember, 'id'>): Promise<EventMember>;
  update(member: EventMember): Promise<EventMember>;
  delete(memberId: string): Promise<void>;
  listByEvent(eventId: string): Promise<EventMember[]>;
  listByUser(userId: string): Promise<EventMember[]>;
}
