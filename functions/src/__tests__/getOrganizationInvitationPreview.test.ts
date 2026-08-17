import { handleGetOrganizationInvitationPreview } from '../organizations/getOrganizationInvitationPreview';
import { FakeFirestore, asFirestore } from './fakeFirestore';

const ORG_ID = 'org1';
const INVITATION_ID = 'inv1';

function seedOrganization(fake: FakeFirestore, organizationId = ORG_ID): void {
  fake.seed('organizations', organizationId, { id: organizationId, name: 'Royal Events' });
}

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

describe('handleGetOrganizationInvitationPreview', () => {
  test('rejects an unauthenticated request', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(handleGetOrganizationInvitationPreview(db, validInput, {})).rejects.toMatchObject({
      code: 'unauthenticated'
    });
  });

  test('a missing invitation is reported as not found', async () => {
    const db = asFirestore(new FakeFirestore());

    await expect(
      handleGetOrganizationInvitationPreview(db, validInput, {
        auth: { uid: 'user1', token: { email: 'meena@example.com' } }
      })
    ).rejects.toMatchObject({ code: 'invitation_not_found' });
  });

  test("rejects when the caller's email does not match the invitation", async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake);
    const db = asFirestore(fake);

    await expect(
      handleGetOrganizationInvitationPreview(db, validInput, {
        auth: { uid: 'user1', token: { email: 'someone-else@example.com' } }
      })
    ).rejects.toMatchObject({ code: 'invitation_email_mismatch' });
  });

  test('returns the organization name and invitation details', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake, INVITATION_ID, { role: 'planner' });
    const db = asFirestore(fake);

    const result = await handleGetOrganizationInvitationPreview(db, validInput, {
      auth: { uid: 'user1', token: { email: 'meena@example.com' } }
    });

    expect(result).toEqual({
      organizationName: 'Royal Events',
      invitedEmail: 'meena@example.com',
      role: 'planner'
    });
  });

  test('an expired invitation is rejected', async () => {
    const fake = new FakeFirestore();
    seedOrganization(fake);
    seedInvitation(fake, INVITATION_ID, { expiresAt: '2020-01-01T00:00:00.000Z' });
    const db = asFirestore(fake);

    await expect(
      handleGetOrganizationInvitationPreview(db, validInput, {
        auth: { uid: 'user1', token: { email: 'meena@example.com' } }
      })
    ).rejects.toMatchObject({ code: 'invitation_expired' });
  });
});
