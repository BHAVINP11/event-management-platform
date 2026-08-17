"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateOrganization_1 = require("../organizations/updateOrganization");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const ORG_ID = 'org1';
function seedOrganization(fake, organizationId = ORG_ID, overrides = {}) {
    fake.seed('organizations', organizationId, {
        id: organizationId,
        name: 'Royal Events',
        slug: 'royal-events',
        contactEmail: 'hello@royalevents.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
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
const validInput = {
    organizationId: ORG_ID,
    name: 'Royal Events Co.',
    contactEmail: 'contact@royalevents.com'
};
describe('handleUpdateOrganization', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing organization is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_not_found'
        });
    });
    test('a caller with no membership for the organization is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
    test('an owner can update the organization', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, updateOrganization_1.handleUpdateOrganization)(db, { ...validInput, description: 'A wedding planning agency.' }, { auth: { uid: 'user1' } });
        expect(result).toEqual({ organizationId: ORG_ID });
        expect(fake.read('organizations', ORG_ID)).toMatchObject({
            name: 'Royal Events Co.',
            description: 'A wedding planning agency.',
            contactEmail: 'contact@royalevents.com'
        });
    });
    test('an admin can update the organization', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'admin' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('organizations', ORG_ID)).toMatchObject({ name: 'Royal Events Co.' });
    });
    test.each(['planner', 'staff'])('a %s member cannot update the organization', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_role_not_allowed'
        });
    });
    test('rejects an invalid name', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid contact email', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, { ...validInput, contactEmail: 'not-an-email' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_email' });
    });
    test('clears an optional field (removing the description)', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake, ORG_ID, { description: 'Old description', contactPhone: '9999999999' });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } });
        const stored = fake.read('organizations', ORG_ID);
        expect(stored?.description).toBeUndefined();
        expect(stored?.contactPhone).toBeUndefined();
    });
    test('preserves the slug, createdAt, and logoUrl', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake, ORG_ID, {
            slug: 'royal-events',
            createdAt: '2025-01-01T00:00:00.000Z',
            logoUrl: 'https://example.com/logo.png'
        });
        seedMembership(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('organizations', ORG_ID)).toMatchObject({
            slug: 'royal-events',
            createdAt: '2025-01-01T00:00:00.000Z',
            logoUrl: 'https://example.com/logo.png'
        });
    });
    test('an owner of a different organization cannot update this organization', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake, 'org1');
        seedOrganization(fake, 'org2');
        seedMembership(fake, 'user1', { organizationId: 'org2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateOrganization_1.handleUpdateOrganization)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
});
