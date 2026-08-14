import { Guest, GuestSide, GuestStatus } from '@/types/guest';

/** A guest counted "both" contributes to both bride and groom, as well as total. */
export interface GuestCounts {
  total: number;
  bride: number;
  groom: number;
}

export interface GuestListData {
  /**
   * Already scoped to what the current user may see: owner/planner/family/
   * staff/viewer get every guest; a couple member (bride/groom) gets only
   * their own side plus "both". Enforced by the repository read pattern and
   * the Firestore rule, not merely filtered here.
   */
  guests: Guest[];
  /** Computed from the (already-scoped) `guests` above — see computeGuestCounts. */
  counts: GuestCounts;
  /** Whether the current user may add/edit/remove guests at all (owner/planner/couple). */
  canManage: boolean;
  /** Which sides the current user may create or set a guest to. Empty when canManage is false. */
  manageableSides: GuestSide[];
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
