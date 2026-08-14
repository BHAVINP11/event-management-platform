import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';

export interface FunctionListData {
  /** Every function/ceremony for the event — no side-scoping for this domain. */
  functions: EventFunction[];
  /** Whether the current user may add/edit/remove functions (owner/planner only). */
  canManage: boolean;
}

export type FunctionListAccessResult =
  | { status: 'allowed'; data: FunctionListData }
  | { status: 'denied' }
  | { status: 'notFound' };

/** The editable function fields, shared by the add and edit forms. */
export interface FunctionFormInput {
  name: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  notes?: string;
  status: EventFunctionStatus;
}
