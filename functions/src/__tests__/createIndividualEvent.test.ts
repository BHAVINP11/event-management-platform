import { handleCreateIndividualEvent } from '../events/createIndividualEvent';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const validInput = {
  name: 'Bhavin & Priya Wedding',
  type: 'wedding',
  startDate: '2027-02-12T10:00:00.000Z',
  timezone: 'Asia/Kolkata'
};

describe('handleCreateIndividualEvent', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateIndividualEvent(db, validInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('an authenticated user can create an individual event', async () => {
    const db = asFirestore(new FakeFirestore());

    const result = await handleCreateIndividualEvent(db, validInput, { auth: { uid: 'user1' } });

    expect(result.eventId).toBeTruthy();
    expect(result.membershipId).toBe(`${result.eventId}_user1`);
  });

  test('organizationId is always null, regardless of what the client sends', async () => {
    const fake = new FakeFirestore();
    const db = asFirestore(fake);

    const result = await handleCreateIndividualEvent(
      db,
      { ...validInput, organizationId: 'org-injected-by-client' },
      { auth: { uid: 'user1' } }
    );

    const event = fake.read('events', result.eventId);
    expect(event?.organizationId).toBeNull();
  });

  test('createdBy comes from the authenticated UID, never from client input', async () => {
    const fake = new FakeFirestore();
    const db = asFirestore(fake);

    const result = await handleCreateIndividualEvent(
      db,
      { ...validInput, createdBy: 'someone-else', userId: 'someone-else' },
      { auth: { uid: 'user1' } }
    );

    const event = fake.read('events', result.eventId);
    expect(event?.createdBy).toBe('user1');
  });

  test('the event is created with draft status', async () => {
    const fake = new FakeFirestore();
    const db = asFirestore(fake);

    const result = await handleCreateIndividualEvent(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('events', result.eventId)?.status).toBe('draft');
  });

  test('the creator becomes an active owner EventMember', async () => {
    const fake = new FakeFirestore();
    const db = asFirestore(fake);

    const result = await handleCreateIndividualEvent(db, validInput, { auth: { uid: 'user1' } });

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
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleCreateIndividualEvent(db, { ...validInput, name: '' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid timezone', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleCreateIndividualEvent(db, { ...validInput, timezone: 'not-a-timezone' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an end date before the start date', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleCreateIndividualEvent(
        db,
        { ...validInput, startDate: '2027-02-12T10:00:00.000Z', endDate: '2027-02-11T10:00:00.000Z' },
        { auth: { uid: 'user1' } }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
