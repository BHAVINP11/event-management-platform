import { handleAcceptOrganizationInvitation } from '../organizations/acceptOrganizationInvitation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const ORG_ID = 'org1';
const INVITATION_ID = 'inv1';

function seedInvitation(
  fake: FakeFirestore,
  invitationId = INVITATION_ID,
  overrides: { organizationId?: string; invitedEmail?: string; role?: string; status?: string; expiresAt?: string } = {}
): void {
  fake.seed('organizationInvitations', invitationId, {
    id: invitationId,
    organizationId: overrides.organizationId ?? ORG_ID,
    invitedEmail: overrides.invitedEmail ?? 'meena@example.com',
    role: overrides.role ?? 'planner',
    status: overrides.status ?? 'pending',
    invitedBy: 'owner1',
    expiresAt: overrides.expiresAt ?? '2030-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  });
}

const validInput = { invitationId: INVITATION_ID };

describe('handleAcceptOrganizationInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleAcceptOrganizationInvitation(db, validInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('a missing invitation is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleAcceptOrganizationInvitation(db, validInput, { auth: { uid: 'user1', token: { email: 'meena@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_not_found' });
  });

  test('rejects an already accepted invitation', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, INVITATION_ID, { status: 'accepted' });
    const db = asFirestore(fake);

    await expect(
      handleAcceptOrganizationInvitation(db, validInput, { auth: { uid: 'user1', token: { email: 'meena@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_not_pending' });
  });

  test('rejects an expired invitation', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, INVITATION_ID, { expiresAt: '2020-01-01T00:00:00.000Z' });
    const db = asFirestore(fake);

    await expect(
      handleAcceptOrganizationInvitation(db, validInput, { auth: { uid: 'user1', token: { email: 'meena@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_expired' });
  });

  test("rejects when the caller's email does not match the invitation", async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake);
    const db = asFirestore(fake);

    await expect(
      handleAcceptOrganizationInvitation(db, validInput, { auth: { uid: 'user1', token: { email: 'someone-else@example.com' } } })
    ).rejects.toMatchObject({ code: 'invitation_email_mismatch' });
  });

  test('accepts a valid invitation and creates an active OrganizationMember', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, INVITATION_ID, { role: 'planner' });
    const db = asFirestore(fake);

    const result = await handleAcceptOrganizationInvitation(db, validInput, {
      auth: { uid: 'user1', token: { email: 'meena@example.com' } }
    });

    expect(result).toEqual({ organizationId: ORG_ID, membershipId: `${ORG_ID}_user1` });
    expect(fake.read('organizationMembers', `${ORG_ID}_user1`)).toMatchObject({
      organizationId: ORG_ID,
      userId: 'user1',
      role: 'planner',
      status: 'active'
    });
    expect(fake.read('organizationInvitations', INVITATION_ID)).toMatchObject({ status: 'accepted' });
  });

  test('email match is case-insensitive', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake, INVITATION_ID, { invitedEmail: 'meena@example.com' });
    const db = asFirestore(fake);

    await expect(
      handleAcceptOrganizationInvitation(db, validInput, { auth: { uid: 'user1', token: { email: 'Meena@Example.com' } } })
    ).resolves.toMatchObject({ organizationId: ORG_ID });
  });

  test('does not overwrite an already-active membership', async () => {
    const fake = new FakeFirestore();
    seedInvitation(fake);
    fake.seed('organizationMembers', `${ORG_ID}_user1`, {
      id: `${ORG_ID}_user1`,
      organizationId: ORG_ID,
      userId: 'user1',
      role: 'owner',
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });
    const db = asFirestore(fake);

    await handleAcceptOrganizationInvitation(db, validInput, {
      auth: { uid: 'user1', token: { email: 'meena@example.com' } }
    });

    expect(fake.read('organizationMembers', `${ORG_ID}_user1`)).toMatchObject({ role: 'owner' });
  });
});
