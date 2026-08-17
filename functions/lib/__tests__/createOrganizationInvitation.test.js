"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createOrganizationInvitation_1 = require("../organizations/createOrganizationInvitation");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const ORG_ID = 'org1';
const validInput = {
    organizationId: ORG_ID,
    invitedEmail: 'meena@example.com',
    role: 'planner'
};
function seedOrganization(fake, organizationId = ORG_ID) {
    fake.seed('organizations', organizationId, { id: organizationId, name: 'Royal Events' });
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
describe('handleCreateOrganizationInvitation', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('a non-member cannot invite', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'organization_access_denied' });
    });
    test('a planner cannot invite (management tier only)', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'organization_role_not_allowed' });
    });
    test('an owner can invite', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('organizationInvitations', result.invitationId)).toMatchObject({
            organizationId: ORG_ID,
            invitedEmail: 'meena@example.com',
            role: 'planner',
            status: 'pending',
            invitedBy: 'user1'
        });
    });
    test('an admin can invite', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'admin' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('organizationInvitations', result.invitationId)?.status).toBe('pending');
    });
    test('rejects an invalid email', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, { ...validInput, invitedEmail: 'not-an-email' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid role', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, { ...validInput, role: 'owner' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_role' });
    });
    test('rejects a duplicate pending invitation for the same organization and email', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } });
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invitation_already_pending' });
    });
    test('a missing organization is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationInvitation_1.handleCreateOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'organization_not_found' });
    });
});
