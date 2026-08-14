"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authorization_1 = require("../guests/authorization");
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
        expect((0, authorization_1.canAccessGuestSide)(memberSide, guestSide)).toBe(expected);
    });
});
describe('canViewGuest', () => {
    test.each(['owner', 'planner'])('%s can view any side', (role) => {
        expect((0, authorization_1.canViewGuest)({ role }, 'bride')).toBe(true);
        expect((0, authorization_1.canViewGuest)({ role }, 'groom')).toBe(true);
        expect((0, authorization_1.canViewGuest)({ role }, 'both')).toBe(true);
    });
    test.each(['family', 'staff', 'viewer'])('%s can view any side (not scoped this step)', (role) => {
        expect((0, authorization_1.canViewGuest)({ role }, 'bride')).toBe(true);
        expect((0, authorization_1.canViewGuest)({ role }, 'groom')).toBe(true);
    });
    test('a bride member can view bride and both, not groom', () => {
        const membership = { role: 'couple', side: 'bride' };
        expect((0, authorization_1.canViewGuest)(membership, 'bride')).toBe(true);
        expect((0, authorization_1.canViewGuest)(membership, 'both')).toBe(true);
        expect((0, authorization_1.canViewGuest)(membership, 'groom')).toBe(false);
    });
    test('a groom member can view groom and both, not bride', () => {
        const membership = { role: 'couple', side: 'groom' };
        expect((0, authorization_1.canViewGuest)(membership, 'groom')).toBe(true);
        expect((0, authorization_1.canViewGuest)(membership, 'both')).toBe(true);
        expect((0, authorization_1.canViewGuest)(membership, 'bride')).toBe(false);
    });
});
describe('canCreateGuest', () => {
    test.each(['owner', 'planner'])('%s can create any side', (role) => {
        expect((0, authorization_1.canCreateGuest)({ role }, 'bride')).toBe(true);
        expect((0, authorization_1.canCreateGuest)({ role }, 'groom')).toBe(true);
        expect((0, authorization_1.canCreateGuest)({ role }, 'both')).toBe(true);
    });
    test.each(['family', 'staff', 'viewer'])('%s cannot create any side', (role) => {
        expect((0, authorization_1.canCreateGuest)({ role }, 'bride')).toBe(false);
        expect((0, authorization_1.canCreateGuest)({ role }, 'both')).toBe(false);
    });
    test('a bride member can create bride/both, not groom', () => {
        const membership = { role: 'couple', side: 'bride' };
        expect((0, authorization_1.canCreateGuest)(membership, 'bride')).toBe(true);
        expect((0, authorization_1.canCreateGuest)(membership, 'both')).toBe(true);
        expect((0, authorization_1.canCreateGuest)(membership, 'groom')).toBe(false);
    });
    test('a groom member can create groom/both, not bride', () => {
        const membership = { role: 'couple', side: 'groom' };
        expect((0, authorization_1.canCreateGuest)(membership, 'groom')).toBe(true);
        expect((0, authorization_1.canCreateGuest)(membership, 'both')).toBe(true);
        expect((0, authorization_1.canCreateGuest)(membership, 'bride')).toBe(false);
    });
});
describe('canUpdateGuest', () => {
    test.each(['owner', 'planner'])('%s can change any side to any side', (role) => {
        expect((0, authorization_1.canUpdateGuest)({ role }, 'bride', 'groom')).toBe(true);
        expect((0, authorization_1.canUpdateGuest)({ role }, 'groom', 'both')).toBe(true);
    });
    test.each(['family', 'staff', 'viewer'])('%s cannot update regardless of side', (role) => {
        expect((0, authorization_1.canUpdateGuest)({ role }, 'bride', 'bride')).toBe(false);
    });
    test('a bride member can change a bride guest to both', () => {
        expect((0, authorization_1.canUpdateGuest)({ role: 'couple', side: 'bride' }, 'bride', 'both')).toBe(true);
    });
    test('a bride member cannot change a bride guest to groom', () => {
        expect((0, authorization_1.canUpdateGuest)({ role: 'couple', side: 'bride' }, 'bride', 'groom')).toBe(false);
    });
    test('a bride member cannot touch a groom-only guest at all, even to set it to both', () => {
        expect((0, authorization_1.canUpdateGuest)({ role: 'couple', side: 'bride' }, 'groom', 'both')).toBe(false);
    });
    test('a groom member can change a groom guest to both', () => {
        expect((0, authorization_1.canUpdateGuest)({ role: 'couple', side: 'groom' }, 'groom', 'both')).toBe(true);
    });
    test('a groom member cannot change a groom guest to bride', () => {
        expect((0, authorization_1.canUpdateGuest)({ role: 'couple', side: 'groom' }, 'groom', 'bride')).toBe(false);
    });
});
describe('canDeleteGuest', () => {
    test.each(['owner', 'planner'])('%s can delete any side', (role) => {
        expect((0, authorization_1.canDeleteGuest)({ role }, 'bride')).toBe(true);
        expect((0, authorization_1.canDeleteGuest)({ role }, 'groom')).toBe(true);
    });
    test.each(['family', 'staff', 'viewer'])('%s cannot delete', (role) => {
        expect((0, authorization_1.canDeleteGuest)({ role }, 'bride')).toBe(false);
    });
    test('a bride member can delete bride/both, not groom', () => {
        const membership = { role: 'couple', side: 'bride' };
        expect((0, authorization_1.canDeleteGuest)(membership, 'bride')).toBe(true);
        expect((0, authorization_1.canDeleteGuest)(membership, 'both')).toBe(true);
        expect((0, authorization_1.canDeleteGuest)(membership, 'groom')).toBe(false);
    });
    test('a groom member can delete groom/both, not bride', () => {
        const membership = { role: 'couple', side: 'groom' };
        expect((0, authorization_1.canDeleteGuest)(membership, 'groom')).toBe(true);
        expect((0, authorization_1.canDeleteGuest)(membership, 'both')).toBe(true);
        expect((0, authorization_1.canDeleteGuest)(membership, 'bride')).toBe(false);
    });
});
