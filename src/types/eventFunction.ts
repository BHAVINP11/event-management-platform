/**
 * A Function/Ceremony is one of the sub-events that make up an Event (e.g.
 * a wedding's Mehndi, Haldi, Sangeet, Wedding, Reception). Named
 * `EventFunction` rather than the bare `Function`, which would shadow
 * TypeScript's built-in `Function` type.
 */
export enum EventFunctionStatus {
  Planned = 'planned',
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

export interface EventFunction {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  notes?: string;
  status: EventFunctionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
