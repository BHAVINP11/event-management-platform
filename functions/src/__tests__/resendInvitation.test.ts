import { handleResendInvitation } from '../invitations/resendInvitation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';
const INVITATION_ID = 'inv1';

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedEventMember(
  fake: FakeFirestore,
  userId: string,
  overrides: { eventId?: string; status?: string; role?: string } = {}
): void {
  const eventId = overrides.eventId ?? EVENT_ID;
  fake.seed('eventMembers', `${eventId}_${userId}`, {
    eventId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner'
  });
}

function seedInvitation(
  fake: FakeFirestore,
  invitationId = INVITATION_ID,
  overrides: { eventId?: string; status?: string; expiresAt?: string } = {}
): void {
  fake.seed('invitations', invitationId, {
    id: invitationId,
    eventId: overrides.eventId ?? EVENT_ID,
    invitedEmail: 'meena@example.com',
    role: 'family',
    status: overrides.status ?? 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: overrides.expiresAt ?? '2026-06-01T00:00:00.000Z'
  });
}

const validInput = { invitationId: INVITATION_ID };

describe('handleResendInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleResendInvitation(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing invitation is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_not_found'
    });
  });

  test('a caller with no membership for the invitation\'s event is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    const db = asFirestore(fake);

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot resend an invitation', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    seedEventMember(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('an owner can resend a pending invitation, extending its expiry', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, INVITATION_ID, { expiresAt: '2026-06-01T00:00:00.000Z' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleResendInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(result.invitationId).toBe(INVITATION_ID);
    const stored = fake.read('invitations', INVITATION_ID);
    expect(new Date(stored?.expiresAt as string).getTime()).toBeGreaterThan(
      new Date('2026-06-01T00:00:00.000Z').getTime()
    );
    expect(stored?.expiresAt).toBe(result.expiresAt);
  });

  test('a planner can resend a pending invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).resolves.toMatchObject({
      invitationId: INVITATION_ID
    });
  });

  test('can resend an invitation that has already passed its old expiry', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, INVITATION_ID, { expiresAt: '2020-01-01T00:00:00.000Z' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleResendInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('cannot resend an already accepted invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, INVITATION_ID, { status: 'accepted' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_not_pending'
    });
  });

  test('cannot resend a cancelled invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, INVITATION_ID, { status: 'cancelled' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_not_pending'
    });
  });

  test('does not affect an unrelated pending invitation for the same event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, 'inv1', { expiresAt: '2026-06-01T00:00:00.000Z' });
    seedInvitation(fake, 'inv2', { expiresAt: '2026-07-01T00:00:00.000Z' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleResendInvitation(db, { invitationId: 'inv1' }, { auth: { uid: 'user1' } });

    expect(fake.read('invitations', 'inv2')).toMatchObject({ expiresAt: '2026-07-01T00:00:00.000Z' });
  });

  test('an owner of a different event cannot resend this invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedInvitation(fake, INVITATION_ID, { eventId: 'event1' });
    seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleResendInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
