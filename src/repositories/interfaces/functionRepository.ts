import { EventFunction } from '@/types/eventFunction';

export interface FunctionRepository {
  getById(functionId: string): Promise<EventFunction | null>;
  create(fn: Omit<EventFunction, 'id'>): Promise<EventFunction>;
  update(fn: EventFunction): Promise<EventFunction>;
  delete(functionId: string): Promise<void>;
  listByEvent(eventId: string): Promise<EventFunction[]>;
}
