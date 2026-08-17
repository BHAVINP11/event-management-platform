import { handleCreateOrganizationInvitation } from '../organizations/createOrganizationInvitation';
import { ValidationError } from '../validation';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const ORG_ID = 'org1';

const validInput = {
  organizationId: ORG_ID,
  invitedEmail: 'meena@example.com',
  role: 'planner'
};

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

describe('handleCreateOrganizationInvitation', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleCreateOrganizationInvitation(db, validInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('a non-member cannot invite', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    const db = asFirestore(fake);

    await expect(
      handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'organization_access_denied' });
  });

  test('a planner cannot invite (management tier only)', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedMembership(fake, 'user1', { role: 'planner' });
    const db = asFirestore(fake);

    await expect(
      handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'organization_role_not_allowed' });
  });

  test('an owner can invite', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedMembership(fake, 'user1', { role: 'owner' });
    const db = asFirestore(fake);

    const result = await handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('organizationInvitations', result.invitationId)).toMatchObject({
      organizationId: ORG_ID,
      invitedEmail: 'meena@example.com',
      role: 'planner',
      status: 'pending',
      invitedBy: 'user1'
    });
  });

  test('an admin can invite', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedMembership(fake, 'user1', { role: 'admin' });
    const db = asFirestore(fake);

    const result = await handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } });

    expect(fake.read('organizationInvitations', result.invitationId)?.status).toBe('pending');
  });

  test('rejects an invalid email', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedMembership(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateOrganizationInvitation(db, { ...validInput, invitedEmail: 'not-an-email' }, { auth: { uid: 'user1' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects an invalid role', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedMembership(fake, 'user1');
    const db = asFirestore(fake);

    await expect(
      handleCreateOrganizationInvitation(db, { ...validInput, role: 'owner' }, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invalid_role' });
  });

  test('rejects a duplicate pending invitation for the same organization and email', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedMembership(fake, 'user1');
    const db = asFirestore(fake);

    await handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } });

    await expect(
      handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'invitation_already_pending' });
  });

  test('a missing organization is reported as not found', async () => {
    const fake = new FakeFirestore();
    const db = asFirestore(fake);

    await expect(
      handleCreateOrganizationInvitation(db, validInput, { auth: { uid: 'user1' } })
    ).rejects.toMatchObject({ code: 'organization_not_found' });
  });
});
