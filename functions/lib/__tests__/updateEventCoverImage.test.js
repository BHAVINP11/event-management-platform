"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateEventCoverImage_1 = require("../events/updateEventCoverImage");
const validation_1 = require("../validation");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
function seedEvent(fake, eventId = EVENT_ID, overrides = {}) {
    fake.seed('events', eventId, {
        id: eventId,
        name: 'Bhavin & Priya Wedding',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides
    });
}
function seedEventMember(fake, userId, overrides = {}) {
    const eventId = overrides.eventId ?? EVENT_ID;
    fake.seed('eventMembers', `${eventId}_${userId}`, {
        eventId,
        userId,
        status: overrides.status ?? 'active',
        role: overrides.role ?? 'owner'
    });
}
/** An in-memory `StorageBucketLike` double that tracks deleted paths and can simulate missing files. */
class FakeBucket {
    constructor() {
        this.deletedPaths = [];
        this.missingPaths = new Set();
    }
    markMissing(path) {
        this.missingPaths.add(path);
    }
    file(path) {
        return {
            delete: async () => {
                if (this.missingPaths.has(path)) {
                    throw new Error('No such object');
                }
                this.deletedPaths.push(path);
            }
        };
    }
}
const coverUrl = (eventId, fileName) => `https://firebasestorage.googleapis.com/v0/b/my-bucket/o/event-covers%2F${eventId}%2F${fileName}?alt=media&token=abc123`;
const validInput = { eventId: EVENT_ID, coverImageUrl: coverUrl(EVENT_ID, 'photo1.jpg') };
describe('handleUpdateEventCoverImage', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('a missing event is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'event_not_found' });
    });
    test('a caller with no membership for the event is rejected', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'event_access_denied' });
    });
    test('an owner can set the cover image', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        const result = await (0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } });
        expect(result).toEqual({ eventId: EVENT_ID, coverImageUrl: validInput.coverImageUrl });
        expect(fake.read('events', EVENT_ID)?.coverImageUrl).toBe(validInput.coverImageUrl);
    });
    test('a planner can set the cover image', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'planner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await (0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)?.coverImageUrl).toBe(validInput.coverImageUrl);
    });
    test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot set the cover image', async (role) => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'event_role_not_allowed' });
    });
    test('rejects a URL pointing at a different event\'s cover folder', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, { eventId: EVENT_ID, coverImageUrl: coverUrl('some-other-event', 'photo.jpg') }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_cover_image_url' });
    });
    test('rejects a non-Storage URL', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, { eventId: EVENT_ID, coverImageUrl: 'https://evil.example.com/whatever.jpg' }, { auth: { uid: 'user1' } })).rejects.toBeInstanceOf(validation_1.ValidationError);
    });
    test('rejects an empty string', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, { eventId: EVENT_ID, coverImageUrl: '' }, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'invalid_cover_image_url' });
    });
    test('removing the cover image (null) clears the field and deletes the old Storage object', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { coverImageUrl: coverUrl(EVENT_ID, 'photo1.jpg') });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        const result = await (0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, { eventId: EVENT_ID, coverImageUrl: null }, { auth: { uid: 'user1' } });
        expect(result).toEqual({ eventId: EVENT_ID, coverImageUrl: null });
        expect(fake.read('events', EVENT_ID)?.coverImageUrl).toBeNull();
        expect(bucket.deletedPaths).toEqual([`event-covers/${EVENT_ID}/photo1.jpg`]);
    });
    test('replacing the cover image deletes only the old Storage object', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { coverImageUrl: coverUrl(EVENT_ID, 'old.jpg') });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await (0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, { eventId: EVENT_ID, coverImageUrl: coverUrl(EVENT_ID, 'new.jpg') }, { auth: { uid: 'user1' } });
        expect(bucket.deletedPaths).toEqual([`event-covers/${EVENT_ID}/old.jpg`]);
        expect(fake.read('events', EVENT_ID)?.coverImageUrl).toBe(coverUrl(EVENT_ID, 'new.jpg'));
    });
    test('a missing/already-deleted old Storage object does not fail the update', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { coverImageUrl: coverUrl(EVENT_ID, 'old.jpg') });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        bucket.markMissing(`event-covers/${EVENT_ID}/old.jpg`);
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, { eventId: EVENT_ID, coverImageUrl: coverUrl(EVENT_ID, 'new.jpg') }, { auth: { uid: 'user1' } })).resolves.toEqual({ eventId: EVENT_ID, coverImageUrl: coverUrl(EVENT_ID, 'new.jpg') });
        expect(fake.read('events', EVENT_ID)?.coverImageUrl).toBe(coverUrl(EVENT_ID, 'new.jpg'));
    });
    test('setting the same URL again does not attempt to delete it', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { coverImageUrl: coverUrl(EVENT_ID, 'photo1.jpg') });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await (0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } });
        expect(bucket.deletedPaths).toEqual([]);
    });
    test('does not modify other event fields', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, EVENT_ID, { name: 'Bhavin & Priya Wedding', type: 'wedding' });
        seedEventMember(fake, 'user1', { role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await (0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } });
        expect(fake.read('events', EVENT_ID)).toMatchObject({ name: 'Bhavin & Priya Wedding', type: 'wedding' });
    });
    test('an owner of a different event cannot set this event\'s cover image', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake, 'event1');
        seedEvent(fake, 'event2');
        seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const bucket = new FakeBucket();
        await expect((0, updateEventCoverImage_1.handleUpdateEventCoverImage)(db, bucket, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({ code: 'event_access_denied' });
    });
});
