import { handleAcceptInvitation } from '../invitations/acceptInvitation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const INVITATION_ID = 'invitation1';

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function seedInvitation(
  fake: FakeFirestore,
  overrides: {
    invitedEmail?: string;
    role?: string;
    side?: string | null;
    status?: string;
    expiresAt?: string;
    invitedBy?: string;
  } = {}
): void {
  fake.seed('invitations', INVITATION_ID, {
    eventId: EVENT_ID,
    invitedEmail: overrides.invitedEmail ?? 'priya@example.com',
    role: overrides.role ?? 'couple',
    side: 'side' in overrides ? overrides.side : 'bride',
    status: overrides.status ?? 'pending',
    invitedBy: overrides.invitedBy ?? 'owner1',
    expiresAt: overrides.expiresAt ?? future
  });
}

const acceptInput = { invitationId: INVITATION_ID };

describe('handleAcceptInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleAcceptInvitation(db, acceptInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('rejects an invitation that does not exist', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleAcceptInvitation(db, acceptInput, { auth: { uid: 'user1', token: { email: 'priya@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_not_found' });
  });

  test('rejects an invitation that is no longer pending', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, { status: 'accepted' });
    const db = asFirestore(fake);

    await expect(
      handleAcceptInvitation(db, acceptInput, { auth: { uid: 'user1', token: { email: 'priya@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_not_pending' });
  });

  test('rejects an expired invitation', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, { expiresAt: past });
    const db = asFirestore(fake);

    await expect(
      handleAcceptInvitation(db, acceptInput, { auth: { uid: 'user1', token: { email: 'priya@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_expired' });
  });

  test("rejects a caller whose email does not match the invitation's", async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, { invitedEmail: 'priya@example.com' });
    const db = asFirestore(fake);

    await expect(
      handleAcceptInvitation(db, acceptInput, { auth: { uid: 'user1', token: { email: 'someone-else@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_email_mismatch' });
  });

  test('rejects a caller with no email on their auth token', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake);
    const db = asFirestore(fake);

    await expect(
      handleAcceptInvitation(db, acceptInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invitation_email_mismatch' });
  });

  test('a valid invitation creates the EventMember with the deterministic ID', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake);
    const db = asFirestore(fake);

    const result = await handleAcceptInvitation(db, acceptInput, {
      auth: { uid: 'user1', token: { email: 'Priya@Example.com' } }
    });

    expect(result).toEqual({ eventId: EVENT_ID, membershipId: `${EVENT_ID}_user1` });
    expect(fake.read('eventMembers', `${EVENT_ID}_user1`)).toBeDefined();
  });

  test('the membership has the role and side copied from the invitation', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, { role: 'couple', side: 'bride', invitedBy: 'owner1' });
    const db = asFirestore(fake);

    await handleAcceptInvitation(db, acceptInput, {
      auth: { uid: 'user1', token: { email: 'priya@example.com' } }
    });

    expect(fake.read('eventMembers', `${EVENT_ID}_user1`)).toMatchObject({
      eventId: EVENT_ID,
      userId: 'user1',
      role: 'couple',
      side: 'bride',
      status: 'active',
      invitedBy: 'owner1'
    });
  });

  test('a family invitation without a side creates a membership with side null', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, { invitedEmail: 'meena@example.com', role: 'family', side: null });
    const db = asFirestore(fake);

    await handleAcceptInvitation(db, acceptInput, {
      auth: { uid: 'user2', token: { email: 'meena@example.com' } }
    });

    expect(fake.read('eventMembers', `${EVENT_ID}_user2`)).toMatchObject({ role: 'family', side: null });
  });

  test('the invitation becomes accepted', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake);
    const db = asFirestore(fake);

    await handleAcceptInvitation(db, acceptInput, {
      auth: { uid: 'user1', token: { email: 'priya@example.com' } }
    });

    expect(fake.read('invitations', INVITATION_ID)).toMatchObject({ status: 'accepted' });
  });

  test('an existing active membership is not overwritten, but the invitation is still accepted', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, { role: 'family' });
    fake.seed('eventMembers', `${EVENT_ID}_user1`, {
      eventId: EVENT_ID,
      userId: 'user1',
      role: 'owner',
      status: 'active',
      createdAt: '2020-01-01T00:00:00.000Z'
    });
    const db = asFirestore(fake);

    const result = await handleAcceptInvitation(db, acceptInput, {
      auth: { uid: 'user1', token: { email: 'priya@example.com' } }
    });

    expect(result).toEqual({ eventId: EVENT_ID, membershipId: `${EVENT_ID}_user1` });
    // The pre-existing owner membership survives untouched.
    expect(fake.read('eventMembers', `${EVENT_ID}_user1`)).toMatchObject({ role: 'owner', status: 'active' });
    expect(fake.read('invitations', INVITATION_ID)).toMatchObject({ status: 'accepted' });
  });
});
