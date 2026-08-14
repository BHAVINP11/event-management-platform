import {
  canAccessGuestSide,
  canCreateGuest,
  canDeleteGuest,
  canUpdateGuest,
  canViewGuest
} from '../guests/authorization';

describe('canAccessGuestSide', () => {
  test.each([
    ['bride', 'bride', true],
    ['bride', 'both', true],
    ['bride', 'groom', false],
    ['groom', 'groom', true],
    ['groom', 'both', true],
    ['groom', 'bride', false],
    [undefined, 'bride', false],
    [undefined, 'both', false]
  ])('memberSide=%s, guestSide=%s -> %s', (memberSide, guestSide, expected) => {
    expect(canAccessGuestSide(memberSide, guestSide)).toBe(expected);
  });
});

describe('canViewGuest', () => {
  test.each(['owner', 'planner'])('%s can view any side', (role) => {
    expect(canViewGuest({ role }, 'bride')).toBe(true);
    expect(canViewGuest({ role }, 'groom')).toBe(true);
    expect(canViewGuest({ role }, 'both')).toBe(true);
  });

  test.each(['family', 'staff', 'viewer'])('%s can view any side (not scoped this step)', (role) => {
    expect(canViewGuest({ role }, 'bride')).toBe(true);
    expect(canViewGuest({ role }, 'groom')).toBe(true);
  });

  test('a bride member can view bride and both, not groom', () => {
    const membership = { role: 'couple', side: 'bride' };
    expect(canViewGuest(membership, 'bride')).toBe(true);
    expect(canViewGuest(membership, 'both')).toBe(true);
    expect(canViewGuest(membership, 'groom')).toBe(false);
  });

  test('a groom member can view groom and both, not bride', () => {
    const membership = { role: 'couple', side: 'groom' };
    expect(canViewGuest(membership, 'groom')).toBe(true);
    expect(canViewGuest(membership, 'both')).toBe(true);
    expect(canViewGuest(membership, 'bride')).toBe(false);
  });
});

describe('canCreateGuest', () => {
  test.each(['owner', 'planner'])('%s can create any side', (role) => {
    expect(canCreateGuest({ role }, 'bride')).toBe(true);
    expect(canCreateGuest({ role }, 'groom')).toBe(true);
    expect(canCreateGuest({ role }, 'both')).toBe(true);
  });

  test.each(['family', 'staff', 'viewer'])('%s cannot create any side', (role) => {
    expect(canCreateGuest({ role }, 'bride')).toBe(false);
    expect(canCreateGuest({ role }, 'both')).toBe(false);
  });

  test('a bride member can create bride/both, not groom', () => {
    const membership = { role: 'couple', side: 'bride' };
    expect(canCreateGuest(membership, 'bride')).toBe(true);
    expect(canCreateGuest(membership, 'both')).toBe(true);
    expect(canCreateGuest(membership, 'groom')).toBe(false);
  });

  test('a groom member can create groom/both, not bride', () => {
    const membership = { role: 'couple', side: 'groom' };
    expect(canCreateGuest(membership, 'groom')).toBe(true);
    expect(canCreateGuest(membership, 'both')).toBe(true);
    expect(canCreateGuest(membership, 'bride')).toBe(false);
  });
});

describe('canUpdateGuest', () => {
  test.each(['owner', 'planner'])('%s can change any side to any side', (role) => {
    expect(canUpdateGuest({ role }, 'bride', 'groom')).toBe(true);
    expect(canUpdateGuest({ role }, 'groom', 'both')).toBe(true);
  });

  test.each(['family', 'staff', 'viewer'])('%s cannot update regardless of side', (role) => {
    expect(canUpdateGuest({ role }, 'bride', 'bride')).toBe(false);
  });

  test('a bride member can change a bride guest to both', () => {
    expect(canUpdateGuest({ role: 'couple', side: 'bride' }, 'bride', 'both')).toBe(true);
  });

  test('a bride member cannot change a bride guest to groom', () => {
    expect(canUpdateGuest({ role: 'couple', side: 'bride' }, 'bride', 'groom')).toBe(false);
  });

  test('a bride member cannot touch a groom-only guest at all, even to set it to both', () => {
    expect(canUpdateGuest({ role: 'couple', side: 'bride' }, 'groom', 'both')).toBe(false);
  });

  test('a groom member can change a groom guest to both', () => {
    expect(canUpdateGuest({ role: 'couple', side: 'groom' }, 'groom', 'both')).toBe(true);
  });

  test('a groom member cannot change a groom guest to bride', () => {
    expect(canUpdateGuest({ role: 'couple', side: 'groom' }, 'groom', 'bride')).toBe(false);
  });
});

describe('canDeleteGuest', () => {
  test.each(['owner', 'planner'])('%s can delete any side', (role) => {
    expect(canDeleteGuest({ role }, 'bride')).toBe(true);
    expect(canDeleteGuest({ role }, 'groom')).toBe(true);
  });

  test.each(['family', 'staff', 'viewer'])('%s cannot delete', (role) => {
    expect(canDeleteGuest({ role }, 'bride')).toBe(false);
  });

  test('a bride member can delete bride/both, not groom', () => {
    const membership = { role: 'couple', side: 'bride' };
    expect(canDeleteGuest(membership, 'bride')).toBe(true);
    expect(canDeleteGuest(membership, 'both')).toBe(true);
    expect(canDeleteGuest(membership, 'groom')).toBe(false);
  });

  test('a groom member can delete groom/both, not bride', () => {
    const membership = { role: 'couple', side: 'groom' };
    expect(canDeleteGuest(membership, 'groom')).toBe(true);
    expect(canDeleteGuest(membership, 'both')).toBe(true);
    expect(canDeleteGuest(membership, 'bride')).toBe(false);
  });
});
