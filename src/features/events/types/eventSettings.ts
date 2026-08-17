import { EventStatus, EventType } from '@/types/event';

/**
 * Fields collected by the Event Settings form. Matches `onUpdateEvent`'s
 * input exactly (the creation fields plus `status`) — the backend decides
 * everything else (ownership, organization, budget, cover image) on its
 * own.
 */
export interface EventSettingsFormInput {
  name: string;
  type: EventType;
  description?: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
  status: EventStatus;
}
