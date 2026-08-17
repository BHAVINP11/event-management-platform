"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateMemberRole_1 = require("../organizations/updateMemberRole");
const fakeFirestore_1 = require("./fakeFirestore");
const ORG_ID = 'org1';
function seedOrganization(fake, organizationId = ORG_ID) {
    fake.seed('organizations', organizationId, {
        id: organizationId,
        name: 'Royal Events',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
    });
}
function seedMembership(fake, userId, overrides = {}) {
    const organizationId = overrides.organizationId ?? ORG_ID;
    fake.seed('organizationMembers', `${organizationId}_${userId}`, {
        organizationId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner'
    });
}
const validInput = { organizationId: ORG_ID, userId: 'target-user', role: 'staff' };
describe('handleUpdateOrganizationMemberRole', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('a missing organization is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'organization_not_found' });
    });
    test('a caller with no membership for the organization is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'organization_access_denied' });
    });
    test.each(['planner', 'staff'])('a %s caller cannot change a member role', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role });
        seedMembership(fake, 'target-user', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'organization_role_not_allowed' });
    });
    test('an owner can change a member to admin', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'owner' });
        seedMembership(fake, 'target-user', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, { organizationId: ORG_ID, userId: 'target-user', role: 'admin' }, { auth: { uid: 'caller' } });
        expect(result).toEqual({ organizationId: ORG_ID, userId: 'target-user', role: 'admin' });
        expect(fake.read('organizationMembers', `${ORG_ID}_target-user`)).toMatchObject({ role: 'admin' });
    });
    test('an admin can change a member to planner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'admin' });
        seedMembership(fake, 'target-user', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, { organizationId: ORG_ID, userId: 'target-user', role: 'planner' }, { auth: { uid: 'caller' } });
        expect(fake.read('organizationMembers', `${ORG_ID}_target-user`)).toMatchObject({ role: 'planner' });
    });
    test('rejects an attempt to promote a member to owner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'owner' });
        seedMembership(fake, 'target-user', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, { organizationId: ORG_ID, userId: 'target-user', role: 'owner' }, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'invalid_role' });
    });
    test("cannot change the organization owner's role", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'admin' });
        seedMembership(fake, 'target-user', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'organization_owner_role_immutable' });
        expect(fake.read('organizationMembers', `${ORG_ID}_target-user`)).toMatchObject({ role: 'owner' });
    });
    test('a missing target member is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'organization_member_not_found' });
    });
    test("an owner of a different organization cannot change this organization's member role", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake, 'org1');
        seedOrganization(fake, 'org2');
        seedMembership(fake, 'caller', { organizationId: 'org2', role: 'owner' });
        seedMembership(fake, 'target-user', { organizationId: 'org1', role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateMemberRole_1.handleUpdateOrganizationMemberRole)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({ code: 'organization_access_denied' });
    });
});
