"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resendOrganizationInvitation_1 = require("../organizations/resendOrganizationInvitation");
const fakeFirestore_1 = require("./fakeFirestore");
const ORG_ID = 'org1';
const INVITATION_ID = 'inv1';
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
function seedInvitation(fake, invitationId = INVITATION_ID, overrides = {}) {
    fake.seed('organizationInvitations', invitationId, {
        id: invitationId,
        organizationId: overrides.organizationId ?? ORG_ID,
        invitedEmail: 'meena@example.com',
        role: 'planner',
        status: overrides.status ?? 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: overrides.expiresAt ?? '2026-06-01T00:00:00.000Z'
    });
}
const validInput = { invitationId: INVITATION_ID };
describe('handleResendOrganizationInvitation', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('a missing invitation is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invitation_not_found' });
    });
    test("a caller with no membership for the invitation's organization is rejected", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'organization_access_denied' });
    });
    test.each(['planner', 'staff'])('a %s member cannot resend an invitation', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake);
        seedMembership(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'organization_role_not_allowed' });
    });
    test('an owner can resend a pending invitation, extending its expiry', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake, INVITATION_ID, { expiresAt: '2026-06-01T00:00:00.000Z' });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } });
        expect(result.invitationId).toBe(INVITATION_ID);
        const stored = fake.read('organizationInvitations', INVITATION_ID);
        expect(new Date(stored?.expiresAt).getTime()).toBeGreaterThan(new Date('2026-06-01T00:00:00.000Z').getTime());
        expect(stored?.expiresAt).toBe(result.expiresAt);
    });
    test('an admin can resend a pending invitation', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake);
        seedMembership(fake, 'user1', { role: 'admin' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).resolves.toMatchObject({
            invitationId: INVITATION_ID
        });
    });
    test('can resend an invitation that has already passed its old expiry', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake, INVITATION_ID, { expiresAt: '2020-01-01T00:00:00.000Z' });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } });
        expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
    test('cannot resend an already accepted invitation', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake, INVITATION_ID, { status: 'accepted' });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invitation_not_pending' });
    });
    test('cannot resend a cancelled invitation', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake, INVITATION_ID, { status: 'cancelled' });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invitation_not_pending' });
    });
    test('does not affect an unrelated pending invitation for the same organization', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedInvitation(fake, 'inv1', { expiresAt: '2026-06-01T00:00:00.000Z' });
        seedInvitation(fake, 'inv2', { expiresAt: '2026-07-01T00:00:00.000Z' });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, { invitationId: 'inv1' }, { auth: { uid: 'user1' } });
        expect(fake.read('organizationInvitations', 'inv2')).toMatchObject({ expiresAt: '2026-07-01T00:00:00.000Z' });
    });
    test('an owner of a different organization cannot resend this invitation', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake, 'org1');
        seedOrganization(fake, 'org2');
        seedInvitation(fake, INVITATION_ID, { organizationId: 'org1' });
        seedMembership(fake, 'user1', { organizationId: 'org2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, resendOrganizationInvitation_1.handleResendOrganizationInvitation)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'organization_access_denied' });
    });
});
