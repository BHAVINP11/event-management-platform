import { canAccessGuestSide, canManageGuests, manageableGuestSides } from '@/features/events/services/guestAuthorization';
import { EventMemberSide, EventRole } from '@/types/membership';
import { GuestSide } from '@/types/guest';

describe('canAccessGuestSide', () => {
  test.each([
    [EventMemberSide.Bride, GuestSide.Bride, true],
    [EventMemberSide.Bride, GuestSide.Both, true],
    [EventMemberSide.Bride, GuestSide.Groom, false],
    [EventMemberSide.Groom, GuestSide.Groom, true],
    [EventMemberSide.Groom, GuestSide.Both, true],
    [EventMemberSide.Groom, GuestSide.Bride, false],
    [undefined, GuestSide.Bride, false]
  ])('memberSide=%s, guestSide=%s -> %s', (memberSide, guestSide, expected) => {
    expect(canAccessGuestSide(memberSide, guestSide)).toBe(expected);
  });
});

describe('canManageGuests', () => {
  test.each([EventRole.Owner, EventRole.Planner, EventRole.Couple])('%s can manage guests', (role) => {
    expect(canManageGuests({ role })).toBe(true);
  });

  test.each([EventRole.Family, EventRole.Staff, EventRole.Viewer])('%s cannot manage guests', (role) => {
    expect(canManageGuests({ role })).toBe(false);
  });
});

describe('manageableGuestSides', () => {
  test.each([EventRole.Owner, EventRole.Planner])('%s may set any side', (role) => {
    expect(manageableGuestSides({ role })).toEqual([GuestSide.Bride, GuestSide.Groom, GuestSide.Both]);
  });

  test('a bride member may set bride or both', () => {
    expect(manageableGuestSides({ role: EventRole.Couple, side: EventMemberSide.Bride })).toEqual([
      GuestSide.Bride,
      GuestSide.Both
    ]);
  });

  test('a groom member may set groom or both', () => {
    expect(manageableGuestSides({ role: EventRole.Couple, side: EventMemberSide.Groom })).toEqual([
      GuestSide.Groom,
      GuestSide.Both
    ]);
  });

  test.each([EventRole.Family, EventRole.Staff, EventRole.Viewer])('%s may not set any side', (role) => {
    expect(manageableGuestSides({ role })).toEqual([]);
  });
});
