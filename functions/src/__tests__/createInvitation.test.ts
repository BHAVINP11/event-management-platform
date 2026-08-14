import { handleCreateInvitation } from '../invitations/createInvitation';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const EVENT_ID = 'event1';

const validInput = {
  eventId: EVENT_ID,
  invitedEmail: 'meena@example.com',
  role: 'family'
};

function seedEvent(fake: FakeFirestore, eventId = EVENT_ID): void {
  fake.seed('events', eventId, { id: eventId, name: 'Bhavin & Priya Wedding' });
}

function seedEventMember(
  fake: FakeFirestore,
  userId: string,
  overrides: { eventId?: string; status?: string; role?: string } = {}
): void {
  const eventId = overrides.eventId ?? EVENT_ID;
  fake.seed('eventMembers', `${EVENT_ID}_${userId}`, {
    eventId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner'
  });
}

describe('handleCreateInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateInvitation(db, validInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('a non-member cannot invite', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    const db = asFirestore(fake);

    await expect(handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_access_denied'
    });
  });

  test('a couple member cannot invite yet', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'couple' });
    const db = asFirestore(fake);

    await expect(handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_role_not_allowed'
    });
  });

  test('an owner can invite', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('invitations', result.invitationId)).toMatchObject({
      eventId: EVENT_ID,
      invitedEmail: 'meena@example.com',
      role: 'family',
      status: 'pending',
      invitedBy: 'user1'
    });
  });

  test('a planner can invite', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    const result = await handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('invitations', result.invitationId)?.status).toBe('pending');
  });

  test('rejects an invalid email', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateInvitation(db, { ...validInput, invitedEmail: 'not-an-email' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid role', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateInvitation(db, { ...validInput, role: 'owner' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_role' });
  });

  test('rejects an invalid side for a role that does not use one', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateInvitation(
        db,
        { ...validInput, role: 'planner', side: 'bride' },
        { auth: { uid: 'user1' } }
      )
    ).rejects.toMatchObject({ code: 'invalid_side' });
  });

  test('rejects a side value that is not bride or groom', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateInvitation(
        db,
        { ...validInput, role: 'couple', side: 'best-man' },
        { auth: { uid: 'user1' } }
      )
    ).rejects.toMatchObject({ code: 'invalid_side' });
  });

  test('accepts a couple invitation with a bride/groom side', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    const result = await handleCreateInvitation(
      db,
      { ...validInput, invitedEmail: 'priya@example.com', role: 'couple', side: 'bride' },
      { auth: { uid: 'user1' } }
    );

    expect(fake.read('invitations', result.invitationId)).toMatchObject({ role: 'couple', side: 'bride' });
  });

  test('rejects a duplicate pending invitation for the same event and email', async () => {
    const fake = new FakeFirestore();
    seedEvent(fake);
    seedEventMember(fake, 'user1');
    const db = asFirestore(fake);

    await handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } });

    await expect(handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'invitation_already_pending'
    });
  });

  test('a missing event is reported as not found', async () => {
    const fake = new FakeFirestore();
    const db = asFirestore(fake);

    await expect(handleCreateInvitation(db, validInput, { auth: { uid: 'user1' } })).rejects.toMatchObject({
      code: 'event_not_found'
    });
  });
});
