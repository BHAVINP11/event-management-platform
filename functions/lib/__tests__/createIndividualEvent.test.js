"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createIndividualEvent_1 = require("../events/createIndividualEvent");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const validInput = {
    name: 'Bhavin & Priya Wedding',
    type: 'wedding',
    startDate: '2027-02-12T10:00:00.000Z',
    timezone: 'Asia/Kolkata'
};
describe('handleCreateIndividualEvent', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createIndividualEvent_1.handleCreateIndividualEvent)(db, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('an authenticated user can create an individual event', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        const result = await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(result.eventId).toBeTruthy();
        expect(result.membershipId).toBe(`${result.eventId}_user1`);
    });
    test('organizationId is always null, regardless of what the client sends', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, { ...validInput, organizationId: 'org-injected-by-client' }, { auth: { uid: 'user1' } });
        const event = fake.read('events', result.eventId);
        expect(event?.organizationId).toBeNull();
    });
    test('createdBy comes from the authenticated UID, never from client input', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, { ...validInput, createdBy: 'someone-else', userId: 'someone-else' }, { auth: { uid: 'user1' } });
        const event = fake.read('events', result.eventId);
        expect(event?.createdBy).toBe('user1');
    });
    test('the event is created with draft status', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', result.eventId)?.status).toBe('draft');
    });
    test('the creator becomes an active owner EventMember', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, createIndividualEvent_1.handleCreateIndividualEvent)(db, validInput, { auth: { uid: 'user1' } });
        const membership = fake.read('eventMembers', result.membershipId);
        expect(membership).toMatchObject({
            eventId: result.eventId,
            userId: 'user1',
            role: 'owner',
            status: 'active',
            invitedBy: null
        });
    });
    test('rejects invalid input', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createIndividualEvent_1.handleCreateIndividualEvent)(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an invalid timezone', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createIndividualEvent_1.handleCreateIndividualEvent)(db, { ...validInput, timezone: 'not-a-timezone' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an end date before the start date', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, createIndividualEvent_1.handleCreateIndividualEvent)(db, { ...validInput, startDate: '2027-02-12T10:00:00.000Z', endDate: '2027-02-11T10:00:00.000Z' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
});
