import { Guest, GuestSide, GuestStatus } from '@/types/guest';

/** A guest counted "both" contributes to both bride and groom, as well as total. */
export interface GuestCounts {
  total: number;
  bride: number;
  groom: number;
}

export interface GuestListData {
  guests: Guest[];
  counts: GuestCounts;
  /** Whether the current user may add/edit/remove guests (owner/planner). */
  canManage: boolean;
}

export type GuestListAccessResult =
  | { status: 'allowed'; data: GuestListData }
  | { status: 'denied' }
  | { status: 'notFound' };

/** The editable guest fields, shared by the add and edit forms. */
export interface GuestFormInput {
  name: string;
  phone?: string;
  email?: string;
  side: GuestSide;
  relation?: string;
  notes?: string;
  status: GuestStatus;
}

export function computeGuestCounts(guests: readonly Guest[]): GuestCounts {
  let bride = 0;
  let groom = 0;

  for (const guest of guests) {
    if (guest.side === GuestSide.Bride || guest.side === GuestSide.Both) {
      bride += 1;
    }
    if (guest.side === GuestSide.Groom || guest.side === GuestSide.Both) {
      groom += 1;
    }
  }

  return { total: guests.length, bride, groom };
}
