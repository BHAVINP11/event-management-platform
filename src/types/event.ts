export enum EventType {
  Wedding = 'wedding',
  Social = 'social',
  Corporate = 'corporate',
  Private = 'private',
  Other = 'other'
}

export enum EventStatus {
  Draft = 'draft',
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived'
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  venueName?: string;
  venueAddress?: string;
  /** The event's budget, set via updateEventBudget. Absent until an owner/planner sets one. */
  budgetAmount?: number;
  /** Cover photo URL, set via updateEventCoverImage. Absent until an owner/planner uploads one. */
  coverImageUrl?: string;
  organizationId?: string | null;
  createdBy: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}
