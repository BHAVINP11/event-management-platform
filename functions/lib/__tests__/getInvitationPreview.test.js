"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getInvitationPreview_1 = require("../invitations/getInvitationPreview");
const fakeFirestore_1 = require("./fakeFirestore");
const EVENT_ID = 'event1';
const INVITATION_ID = 'invitation1';
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
function seedEvent(fake) {
    fake.seed('events', EVENT_ID, { id: EVENT_ID, name: 'Bhavin & Priya Wedding' });
}
function seedInvitation(fake, overrides = {}) {
    fake.seed('invitations', INVITATION_ID, {
        eventId: EVENT_ID,
        invitedEmail: 'priya@example.com',
        role: 'couple',
        side: 'bride',
        status: 'pending',
        invitedBy: 'owner1',
        expiresAt: future,
        ...overrides
    });
}
const previewInput = { invitationId: INVITATION_ID };
describe('handleGetInvitationPreview', () => {
    test('rejects an unauthenticated request', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, getInvitationPreview_1.handleGetInvitationPreview)(db, previewInput, {})).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });
    test('returns the event name and invitation summary for the invited person', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedInvitation(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        const result = await (0, getInvitationPreview_1.handleGetInvitationPreview)(db, previewInput, {
            auth: { uid: 'user1', token: { email: 'priya@example.com' } }
        });
        expect(result).toEqual({
            eventName: 'Bhavin & Priya Wedding',
            invitedEmail: 'priya@example.com',
            role: 'couple',
            side: 'bride'
        });
    });
    test('rejects a caller whose email does not match the invitation', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedInvitation(fake);
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, getInvitationPreview_1.handleGetInvitationPreview)(db, previewInput, {
            auth: { uid: 'user1', token: { email: 'stranger@example.com' } }
        })).rejects.toMatchObject({ code: 'invitation_email_mismatch' });
    });
    test('rejects an expired invitation', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedInvitation(fake, { expiresAt: new Date(Date.now() - 1000).toISOString() });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, getInvitationPreview_1.handleGetInvitationPreview)(db, previewInput, {
            auth: { uid: 'user1', token: { email: 'priya@example.com' } }
        })).rejects.toMatchObject({ code: 'invitation_expired' });
    });
    test('rejects an invitation that is no longer pending', async () => {
        const fake = new fakeFirestore_1.FakeFirestore();
        seedEvent(fake);
        seedInvitation(fake, { status: 'accepted' });
        const db = (0, fakeFirestore_1.asFirestore)(fake);
        await expect((0, getInvitationPreview_1.handleGetInvitationPreview)(db, previewInput, {
            auth: { uid: 'user1', token: { email: 'priya@example.com' } }
        })).rejects.toMatchObject({ code: 'invitation_not_pending' });
    });
    test('a missing invitation is reported as not found', async () => {
        const db = (0, fakeFirestore_1.asFirestore)(new fakeFirestore_1.FakeFirestore());
        await expect((0, getInvitationPreview_1.handleGetInvitationPreview)(db, previewInput, {
            auth: { uid: 'user1', token: { email: 'priya@example.com' } }
        })).rejects.toMatchObject({ code: 'invitation_not_found' });
    });
});
