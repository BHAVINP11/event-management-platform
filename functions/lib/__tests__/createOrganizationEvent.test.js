"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createOrganizationEvent_1 = require("../events/createOrganizationEvent");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const ORG_ID = 'org1';
const validInput = {
    organizationId: ORG_ID,
    name: 'Royal Events Gala',
    type: 'corporate',
    startDate: '2027-02-12T10:00:00.000Z',
    timezone: 'Asia/Kolkata'
};
function seedOrganization(fake, organizationId = ORG_ID) {
    fake.seed('organizations', organizationId, { id: organizationId, name: 'Royal Events' });
}
function seedMembership(fake, userId, overrides = {}) {
    const organizationId = overrides.organizationId ?? ORG_ID;
    fake.seed('organizationMembers', `${ORG_ID}_${userId}`, {
        organizationId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner'
    });
}
describe('handleCreateOrganizationEvent', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test.each(['owner', 'admin', 'planner'])('an authenticated %s can create an organization event', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', result.eventId)?.organizationId).toBe(ORG_ID);
    });
    test('staff cannot create an organization event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { role: 'staff' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_role_not_allowed'
        });
    });
    test('an inactive membership cannot create an organization event', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1', { status: 'revoked' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
    test('a membership belonging to a different organization cannot create for this one', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        // Stored at the org1/user1 path but its own organizationId field points
        // elsewhere — the field is checked, not just the document's location.
        seedMembership(fake, 'user1', { organizationId: 'org2' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
    test('a user with no membership at all cannot create for the organization', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_access_denied'
        });
    });
    test('a missing organization is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'organization_not_found'
        });
    });
    test('organizationId and createdBy cannot be overridden by client-supplied ownership fields', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, { ...validInput, createdBy: 'someone-else', ownerId: 'someone-else', userId: 'someone-else' }, { auth: { uid: 'user1' } });
        const event = fake.read('events', result.eventId);
        expect(event?.organizationId).toBe(ORG_ID);
        expect(event?.createdBy).toBe('user1');
    });
    test('createdBy comes from the authenticated UID', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'planner1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'planner1' } });
        expect(fake.read('events', result.eventId)?.createdBy).toBe('planner1');
    });
    test('the event is created with draft status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', result.eventId)?.status).toBe('draft');
    });
    test('the creator becomes an active owner EventMember, with the deterministic membership ID', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(result.membershipId).toBe(`${result.eventId}_user1`);
        expect(fake.read('eventMembers', result.membershipId)).toMatchObject({
            eventId: result.eventId,
            userId: 'user1',
            role: 'owner',
            status: 'active',
            invitedBy: null
        });
    });
    test('the event and its membership are both created', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', result.eventId)).toBeDefined();
        expect(fake.read('eventMembers', result.membershipId)).toMatchObject({ eventId: result.eventId });
    });
    test('rejects invalid event input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedOrganization(fake);
        seedMembership(fake, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects a missing organizationId', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        const { organizationId, ...withoutOrganizationId } = validInput;
        void organizationId;
        await expect((0, createOrganizationEvent_1.handleCreateOrganizationEvent)(db, withoutOrganizationId, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_organization_id' });
    });
});
