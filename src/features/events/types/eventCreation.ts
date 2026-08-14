import { EventType } from '@/types/event';
import { OrganizationRole } from '@/types/membership';

/**
 * Fields collected by the event creation form. Matches the input the trusted
 * Cloud Functions accept — no ownership, status, or membership fields, which
 * the backend decides on its own.
 */
export interface EventCreationFormInput {
  name: string;
  type: EventType;
  description?: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
}

/** An organization the current user may create events for. */
export interface EventCreationOrganizationOption {
  organizationId: string;
  name: string;
  role: OrganizationRole;
}
