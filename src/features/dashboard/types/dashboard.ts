import { EventStatus, EventType } from '@/types/event';
import { EventRole, OrganizationRole } from '@/types/membership';

/**
 * Read-only projections rendered by the dashboard.
 *
 * These intentionally carry only what the launcher UI displays. Domain records
 * hold more (slug, contact details, venue, audit fields) and that data is not
 * surfaced here.
 */

export interface DashboardOrganizationSummary {
  id: string;
  name: string;
  description?: string;
  role: OrganizationRole;
}

export interface DashboardEventSummary {
  id: string;
  name: string;
  type: EventType;
  startDate?: string;
  endDate?: string;
  status: EventStatus;
  role: EventRole;
  /** Null for an individual event that does not belong to an organization. */
  organizationId: string | null;
  /**
   * Resolved only when the user also has access to that organization. Null
   * otherwise — an event membership never implies organization membership.
   */
  organizationName: string | null;
}

export interface DashboardData {
  organizations: DashboardOrganizationSummary[];
  events: DashboardEventSummary[];
  /** Whether event-creation entry points should be offered to this user. */
  canCreateEvent: boolean;
}
