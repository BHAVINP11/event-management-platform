/**
 * A Guest is an event attendee, not a platform User — they need no account,
 * login, or profile. `side` uses its own enum (bride/groom/both) rather than
 * `EventMemberSide`, since a guest can belong to both sides in a way a
 * member's role never does.
 */
export enum GuestSide {
  Bride = 'bride',
  Groom = 'groom',
  Both = 'both'
}

export enum GuestStatus {
  Pending = 'pending',
  Invited = 'invited',
  Confirmed = 'confirmed',
  Declined = 'declined'
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  phone?: string;
  email?: string;
  side: GuestSide;
  relation?: string;
  notes?: string;
  status: GuestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
