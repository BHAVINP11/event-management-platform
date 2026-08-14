"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateVendor_1 = require("../vendors/updateVendor");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const VENDOR_ID = 'vendor1';
function seedEvent(fake, eventId = EVENT_ID) {
    fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}
function seedVendor(fake, overrides = {}) {
    fake.seed('vendors', VENDOR_ID, {
        eventId: EVENT_ID,
        name: 'Royal Caterers',
        category: 'catering',
        status: 'enquiry',
        createdBy: 'owner1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    });
}
function seedEventMember(fake, eventId, userId, overrides = {}) {
    fake.seed('eventMembers', `${eventId}_${userId}`, {
        eventId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner',
        ...(overrides.side ? { side: overrides.side } : {})
    });
}
const validInput = {
    vendorId: VENDOR_ID,
    name: 'Royal Caterers Pvt Ltd',
    category: 'catering',
    status: 'shortlisted'
};
describe('handleUpdateVendor', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, updateVendor_1.handleUpdateVendor)(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    test('a missing vendor is reported as not found', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'vendor_not_found'
        });
    });
    test("a caller with no membership for the vendor's event is rejected", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an inactive member is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { status: 'inactive' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
    test('an owner can update a vendor', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('vendors', VENDOR_ID)).toMatchObject({
            name: 'Royal Caterers Pvt Ltd',
            status: 'shortlisted'
        });
    });
    test('a planner can update a vendor', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('vendors', VENDOR_ID)?.status).toBe('shortlisted');
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot update a vendor', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake);
        seedEventMember(fake, EVENT_ID, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_role_not_allowed'
        });
        expect(fake.read('vendors', VENDOR_ID)?.name).toBe('Royal Caterers');
    });
    test('id, eventId, createdBy, and createdAt are preserved regardless of client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake, { createdBy: 'owner1', createdAt: '2020-01-01T00:00:00.000Z' });
        seedEventMember(fake, EVENT_ID, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await (0, updateVendor_1.handleUpdateVendor)(db, { ...validInput, id: 'hacked-id', eventId: 'event-hacked', createdBy: 'user1', createdAt: 'now' }, { auth: { uid: 'user1' } });
        expect(fake.read('vendors', VENDOR_ID)).toMatchObject({
            id: VENDOR_ID,
            eventId: EVENT_ID,
            createdBy: 'owner1',
            createdAt: '2020-01-01T00:00:00.000Z'
        });
    });
    test('rejects an invalid category', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedVendor(fake);
        seedEventMember(fake, EVENT_ID, 'user1');
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateVendor_1.handleUpdateVendor)(db, { ...validInput, category: 'flowers' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test("an owner of a different event cannot update this event's vendor", async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedVendor(fake, { eventId: 'event1' });
        seedEventMember(fake, 'event2', 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, updateVendor_1.handleUpdateVendor)(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
            code: 'event_access_denied'
        });
    });
});
