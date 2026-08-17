import { EventStatus, EventType } from '@/types/event';
import { EventMemberSide, EventRole } from '@/types/membership';

export interface EventDetailView {
  id: string;
  name: string;
  type: EventType;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  venueName?: string;
  venueAddress?: string;
  status: EventStatus;
  role: EventRole;
  /**
   * Only meaningful for `EventRole.Couple`/`EventRole.Family` — projected
   * straight from the already-loaded membership (see
   * `EventAccessService.loadEvent`), so surfacing it costs no additional
   * read.
   */
  side?: EventMemberSide;
  organizationId: string | null;
  /** Resolved only when the user also has access to that organization. */
  organizationName: string | null;
  /**
   * Projected straight from the already-loaded Event document (see
   * `EventAccessService.loadEvent`) — surfacing it costs no additional
   * read, since the full event is fetched regardless. Absent until an
   * owner/planner sets one via `updateEventBudget`.
   */
  budgetAmount?: number;
  /**
   * Projected straight from the already-loaded Event document (see
   * `EventAccessService.loadEvent`) — surfacing it costs no additional
   * read. Absent until an owner/planner uploads one via
   * `updateEventCoverImage`.
   */
  coverImageUrl?: string;
}

export type EventAccessResult =
  | { status: 'allowed'; event: EventDetailView }
  | { status: 'denied' }
  | { status: 'notFound' };
