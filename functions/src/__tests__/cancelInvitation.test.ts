import { handleCancelInvitation } from '../invitations/cancelInvitation';
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
  overrides: { eventId?: string; status?: string } = {}
): void {
  fake.seed('invitations', invitationId, {
    id: invitationId,
    eventId: overrides.eventId ?? EVENT_ID,
    invitedEmail: 'meena@example.com',
    role: 'family',
    status: overrides.status ?? 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-06-01T00:00:00.000Z'
  });
}

const validInput = { invitationId: INVITATION_ID };

describe('handleCancelInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCancelInvitation(db, validInput, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('a missing invitation is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_not_found'
    });
  });

  test('a caller with no membership for the invitation\'s event is rejected', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    const db = asFirestore(fake);

    await expect(handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test.each(['couple', 'family', 'staff', 'viewer'])('a %s member cannot cancel an invitation', async (role) => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    seedEventMember(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('an owner can cancel a pending invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ invitationId: INVITATION_ID });
    expect(fake.read('invitations', INVITATION_ID)).toMatchObject({ status: 'cancelled' });
  });

  test('a planner can cancel a pending invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('invitations', INVITATION_ID)).toMatchObject({ status: 'cancelled' });
  });

  test('cannot cancel an already accepted invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, INVITATION_ID, { status: 'accepted' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_not_pending'
    });
    expect(fake.read('invitations', INVITATION_ID)).toMatchObject({ status: 'accepted' });
  });

  test('cannot cancel an already cancelled invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, INVITATION_ID, { status: 'cancelled' });
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_not_pending'
    });
  });

  test('does not affect an unrelated pending invitation for the same event', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedInvitation(fake, 'inv1');
    seedInvitation(fake, 'inv2');
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleCancelInvitation(db, { invitationId: 'inv1' }, { auth: { uid: 'user1' } });

    expect(fake.read('invitations', 'inv2')).toMatchObject({ status: 'pending' });
  });

  test('an owner of a different event cannot cancel this invitation', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake, 'event1');
    seedEvent(fake, 'event2');
    seedInvitation(fake, INVITATION_ID, { eventId: 'event1' });
    seedEventMember(fake, 'user1', { eventId: 'event2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(handleCancelInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });
});
