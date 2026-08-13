import { EventStatus, EventType } from '@/types/event';
import { EventRole } from '@/types/membership';

export interface EventDetailView {
  id: string;
  name: string;
  type: EventType;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: EventStatus;
  role: EventRole;
  organizationId: string | null;
  /** Resolved only when the user also has access to that organization. */
  organizationName: string | null;
}

export type EventAccessResult =
  | { status: 'allowed'; event: EventDetailView }
  | { status: 'denied' }
  | { status: 'notFound' };
