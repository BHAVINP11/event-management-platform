"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const removeMember_1 = require("../organizations/removeMember");
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
const validInput = { organizationId: ORG_ID, userId: 'target-user' };
describe('handleRemoveOrganizationMember', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('a missing organization is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'organization_not_found'
        });
    });
    test('a caller with no membership for the organization is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
    test.each(['planner', 'staff'])('a %s caller cannot remove a member', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role });
        seedMembership(fake, 'target-user', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'organization_role_not_allowed'
        });
    });
    test('an owner can remove an admin', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'owner' });
        seedMembership(fake, 'target-user', { role: 'admin' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } });
        expect(result).toEqual({ organizationId: ORG_ID, userId: 'target-user' });
        expect(fake.read('organizationMembers', `${ORG_ID}_target-user`)).toMatchObject({ status: 'revoked' });
    });
    test('an admin can remove a planner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'admin' });
        seedMembership(fake, 'target-user', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } });
        expect(fake.read('organizationMembers', `${ORG_ID}_target-user`)).toMatchObject({ status: 'revoked' });
    });
    test('cannot remove the organization owner', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'admin' });
        seedMembership(fake, 'target-user', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'organization_owner_cannot_be_removed'
        });
        expect(fake.read('organizationMembers', `${ORG_ID}_target-user`)).toMatchObject({ status: 'active' });
    });
    test('a missing target member is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'organization_member_not_found'
        });
    });
    test('does not affect an unrelated member', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'caller', { role: 'owner' });
        seedMembership(fake, 'target-user', { role: 'staff' });
        seedMembership(fake, 'other-user', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } });
        expect(fake.read('organizationMembers', `${ORG_ID}_other-user`)).toMatchObject({ status: 'active' });
    });
    test("an owner of a different organization cannot remove this organization's member", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake, 'org1');
        seedOrganization(fake, 'org2');
        seedMembership(fake, 'caller', { organizationId: 'org2', role: 'owner' });
        seedMembership(fake, 'target-user', { organizationId: 'org1', role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, removeMember_1.handleRemoveOrganizationMember)(db, validInput, { auth: { uid: 'caller' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
});
