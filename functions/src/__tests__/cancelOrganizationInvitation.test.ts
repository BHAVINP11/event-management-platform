import { handleCancelOrganizationInvitation } from '../organizations/cancelOrganizationInvitation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const ORG_ID = 'org1';
const INVITATION_ID = 'inv1';

function seedOrganization(fake: FakeFirestore, organizationId = ORG_ID): void {
  fake.seed('organizations', organizationId, { id: organizationId, name: 'Royal Events' });
}

function seedMembership(
  fake: FakeFirestore,
  userId: string,
  overrides: { organizationId?: string; status?: string; role?: string } = {}
): void {
  const organizationId = overrides.organizationId ?? ORG_ID;
  fake.seed('organizationMembers', `${organizationId}_${userId}`, {
    organizationId,
    userId,
    status: overrides.status ?? 'active',
    role: overrides.role ?? 'owner'
  });
}

function seedInvitation(
  fake: FakeFirestore,
  invitationId = INVITATION_ID,
  overrides: { organizationId?: string; status?: string } = {}
): void {
  fake.seed('organizationInvitations', invitationId, {
    id: invitationId,
    organizationId: overrides.organizationId ?? ORG_ID,
    invitedEmail: 'meena@example.com',
    role: 'planner',
    status: overrides.status ?? 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-06-01T00:00:00.000Z'
  });
}

const validInput = { invitationId: INVITATION_ID };

describe('handleCancelOrganizationInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCancelOrganizationInvitation(db, validInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('a missing invitation is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invitation_not_found' });
  });

  test("a caller with no membership for the invitation's organization is rejected", async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake);
    const db = asFirestore(fake);

    await expect(
      handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'organization_access_denied' });
  });

  test.each(['planner', 'staff'])('a %s member cannot cancel an invitation', async (role) => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake);
    seedMembership(fake, 'user1', { role });
    const db = asFirestore(fake);

    await expect(
      handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'organization_role_not_allowed' });
  });

  test('an owner can cancel a pending invitation', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake);
    seedMembership(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(result).toEqual({ invitationId: INVITATION_ID });
    expect(fake.read('organizationInvitations', INVITATION_ID)).toMatchObject({ status: 'cancelled' });
  });

  test('an admin can cancel a pending invitation', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake);
    seedMembership(fake, 'user1', { role: 'admin' });
    const db = asFirestore(fake);

    await handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('organizationInvitations', INVITATION_ID)).toMatchObject({ status: 'cancelled' });
  });

  test('cannot cancel an already accepted invitation', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake, INVITATION_ID, { status: 'accepted' });
    seedMembership(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await expect(
      handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invitation_not_pending' });
    expect(fake.read('organizationInvitations', INVITATION_ID)).toMatchObject({ status: 'accepted' });
  });

  test('does not affect an unrelated pending invitation for the same organization', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake, 'inv1');
    seedInvitation(fake, 'inv2');
    seedMembership(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    await handleCancelOrganizationInvitation(db, { invitationId: 'inv1' }, { auth: { uid: 'user1' } });

    expect(fake.read('organizationInvitations', 'inv2')).toMatchObject({ status: 'pending' });
  });

  test('an owner of a different organization cannot cancel this invitation', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake, 'org1');
    seedOrganization(fake, 'org2');
    seedInvitation(fake, INVITATION_ID, { organizationId: 'org1' });
    seedMembership(fake, 'user1', { organizationId: 'org2', role: 'owner' });
    const db = asFirestore(fake);

    await expect(
      handleCancelOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'organization_access_denied' });
  });
});
