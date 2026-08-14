import { initializeTestEnvironment, RulesTestContext, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

const now = '2026-01-01T00:00:00.000Z';
const organizationMembershipId = (organizationId: string, userId: string): string => `${organizationId}_${userId}`;
const eventMembershipId = (eventId: string, userId: string): string => `${eventId}_${userId}`;

const organization = (id = 'org1') => ({
  id,
  name: 'Test Org',
  slug: 'test-org',
  contactEmail: 'contact@org.com',
  createdAt: now,
  updatedAt: now
});

const event = (id = 'event1') => ({
  id,
  name: 'Test Event',
  type: 'wedding',
  createdBy: 'user1',
  status: 'active',
  createdAt: now,
  updatedAt: now
});

const organizationMember = (organizationId: string, userId: string, status: string) => ({
  id: organizationMembershipId(organizationId, userId),
  organizationId,
  userId,
  role: 'owner',
  status,
  createdAt: now,
  updatedAt: now
});

const eventMember = (
  eventId: string,
  userId: string,
  status: string,
  role = 'owner',
  side?: string
) => ({
  id: eventMembershipId(eventId, userId),
  eventId,
  userId,
  role,
  status,
  ...(side ? { side } : {}),
  createdAt: now,
  updatedAt: now
});

const guest = (eventId: string, name = 'Rajesh Patel', side = 'bride') => ({
  id: 'guest1',
  eventId,
  name,
  side,
  status: 'pending',
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now
});

const eventFunction = (eventId: string, name = 'Mehndi') => ({
  id: 'function1',
  eventId,
  name,
  status: 'planned',
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now
});

const expense = (eventId: string, title = 'Venue Booking') => ({
  id: 'expense1',
  eventId,
  title,
  category: 'venue',
  amount: 200000,
  paymentStatus: 'unpaid',
  paidAmount: 0,
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now
});

const vendor = (eventId: string, name = 'Royal Caterers') => ({
  id: 'vendor1',
  eventId,
  name,
  category: 'catering',
  status: 'enquiry',
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now
});

const task = (eventId: string, title = 'Book the venue') => ({
  id: 'task1',
  eventId,
  title,
  status: 'todo',
  priority: 'medium',
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now
});

const invitation = (eventId: string, invitedEmail: string, status = 'pending') => ({
  id: 'invitation1',
  eventId,
  invitedEmail,
  role: 'family',
  status,
  invitedBy: 'owner1',
  expiresAt: '2030-01-01T00:00:00.000Z',
  createdAt: now,
  updatedAt: now
});

const seed = async (callback: (adminDb: RulesTestContext) => Promise<void>): Promise<void> => {
  await testEnv.withSecurityRulesDisabled(callback);
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'event-management-test',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8')
    }
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  describe('User profiles', () => {
    test('user can read their own profile', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('users').doc('user1').set({
          id: 'user1', firstName: 'John', lastName: 'Doe', displayName: 'John Doe', email: 'john@example.com', createdAt: now, updatedAt: now
        });
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('users').doc('user1').get()).resolves.toBeDefined();
    });

    test('user cannot read another user profile', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('users').doc('user2').set({
          id: 'user2', firstName: 'Jane', lastName: 'Doe', displayName: 'Jane Doe', email: 'jane@example.com', createdAt: now, updatedAt: now
        });
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('users').doc('user2').get()).rejects.toThrow();
    });

    test('user cannot modify another user profile', async () => {
      await expect(testEnv.authenticatedContext('user1').firestore().collection('users').doc('user2').update({ firstName: 'Hacked' })).rejects.toThrow();
    });
  });

  describe('Organizations', () => {
    test('unauthenticated user cannot read organization', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('organizations').doc('org1').set(organization()));

      await expect(testEnv.unauthenticatedContext().firestore().collection('organizations').doc('org1').get()).rejects.toThrow();
    });

    test('authenticated non-member cannot read organization', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('organizations').doc('org1').set(organization()));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('organizations').doc('org1').get()).rejects.toThrow();
    });

    test('active organization member can read organization', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('organizations').doc('org1').set(organization());
        await adminDb.firestore().collection('organizationMembers').doc(organizationMembershipId('org1', 'user1')).set(organizationMember('org1', 'user1', 'active'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('organizations').doc('org1').get()).resolves.toBeDefined();
    });

    test('inactive organization member cannot read organization', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('organizations').doc('org1').set(organization());
        await adminDb.firestore().collection('organizationMembers').doc(organizationMembershipId('org1', 'user1')).set(organizationMember('org1', 'user1', 'inactive'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('organizations').doc('org1').get()).rejects.toThrow();
    });

    test('malformed organization membership at the expected path cannot grant access', async () => {
      const memberId = organizationMembershipId('org1', 'user1');
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('organizations').doc('org1').set(organization());
        await adminDb.firestore().collection('organizationMembers').doc(memberId).set({
          ...organizationMember('different-org', 'user1', 'active'),
          id: memberId
        });
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('organizations').doc('org1').get()).rejects.toThrow();
    });
  });

  describe('Events', () => {
    test('authenticated non-member cannot read event', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('events').doc('event1').set(event()));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('events').doc('event1').get()).rejects.toThrow();
    });

    test('active event member can read event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('events').doc('event1').set(event());
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('events').doc('event1').get()).resolves.toBeDefined();
    });

    test('inactive event member cannot read event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('events').doc('event1').set(event());
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('events').doc('event1').get()).rejects.toThrow();
    });

    test('malformed event membership at the expected path cannot grant access', async () => {
      const memberId = eventMembershipId('event1', 'user1');
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('events').doc('event1').set(event());
        await adminDb.firestore().collection('eventMembers').doc(memberId).set({
          ...eventMember('event1', 'different-user', 'active'),
          id: memberId
        });
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('events').doc('event1').get()).rejects.toThrow();
    });
  });

  describe('Memberships', () => {
    test('user can read their own deterministic organization membership', async () => {
      const memberId = organizationMembershipId('org1', 'user1');
      await seed(async (adminDb) => adminDb.firestore().collection('organizationMembers').doc(memberId).set(organizationMember('org1', 'user1', 'active')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('organizationMembers').doc(memberId).get()).resolves.toBeDefined();
    });

    test('user cannot create arbitrary organization membership, including a duplicate relationship', async () => {
      const memberId = organizationMembershipId('org1', 'user1');
      await seed(async (adminDb) => adminDb.firestore().collection('organizationMembers').doc(memberId).set(organizationMember('org1', 'user1', 'active')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('organizationMembers').doc(memberId).set(organizationMember('org1', 'user1', 'active'))).rejects.toThrow();
    });

    test('user can read their own deterministic event membership', async () => {
      const memberId = eventMembershipId('event1', 'user1');
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(memberId).set(eventMember('event1', 'user1', 'active')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('eventMembers').doc(memberId).get()).resolves.toBeDefined();
    });

    test('user cannot create arbitrary event membership, including a duplicate relationship', async () => {
      const memberId = eventMembershipId('event1', 'user1');
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(memberId).set(eventMember('event1', 'user1', 'active')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('eventMembers').doc(memberId).set(eventMember('event1', 'user1', 'active'))).rejects.toThrow();
    });
  });

  // The dashboard discovers resources by listing the current user's memberships
  // and then reading the referenced documents one by one. These tests pin that
  // read pattern to the rules, and confirm the rules remain the boundary even
  // though the dashboard also filters client-side.
  describe('Dashboard discovery reads', () => {
    test('user can list their own organization memberships', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('organizationMembers').doc(organizationMembershipId('org1', 'user1')).set(organizationMember('org1', 'user1', 'active'));
        await adminDb.firestore().collection('organizationMembers').doc(organizationMembershipId('org2', 'user2')).set(organizationMember('org2', 'user2', 'active'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('organizationMembers').where('userId', '==', 'user1').get();
      expect(snapshot.docs).toHaveLength(1);
    });

    test('user can list their own event memberships', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user2')).set(eventMember('event2', 'user2', 'active'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('eventMembers').where('userId', '==', 'user1').get();
      expect(snapshot.docs).toHaveLength(1);
    });

    test('user cannot list memberships belonging to another user', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).set(eventMember('event1', 'user2', 'active')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('eventMembers').where('userId', '==', 'user2').get()).rejects.toThrow();
    });

    test('user cannot list every membership', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('eventMembers').get()).rejects.toThrow();
    });

    test('user cannot enumerate events or organizations', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('events').doc('event1').set(event());
        await adminDb.firestore().collection('organizations').doc('org1').set(organization());
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('organizationMembers').doc(organizationMembershipId('org1', 'user1')).set(organizationMember('org1', 'user1', 'active'));
      });

      const db = testEnv.authenticatedContext('user1').firestore();
      await expect(db.collection('events').get()).rejects.toThrow();
      await expect(db.collection('organizations').get()).rejects.toThrow();
    });
  });

  // Step 10 widens eventMembers reads so the People page can list everyone on
  // a shared event, not just the caller's own membership. The widening is
  // gated on the caller already being an active member of that same event.
  describe('People page: co-member visibility', () => {
    test('an active event member can read a co-member\'s membership for the same event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).set(eventMember('event1', 'user2', 'active'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).get()
      ).resolves.toBeDefined();
    });

    test('an active event member can list every membership for that event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).set(eventMember('event1', 'user2', 'active'));
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user3')).set(eventMember('event2', 'user3', 'active'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('eventMembers').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });

    test('a user cannot read a co-member\'s membership for an event they do not belong to', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).set(eventMember('event1', 'user2', 'active'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).get()
      ).rejects.toThrow();
    });

    test('an inactive membership does not grant visibility into the event\'s other members', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).set(eventMember('event1', 'user2', 'active'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user2')).get()
      ).rejects.toThrow();
    });
  });

  describe('Invitations', () => {
    test('the invited person can read their own invitation by matching authenticated email', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com')));

      await expect(
        testEnv.authenticatedContext('user1', { email: 'meena@example.com' }).firestore().collection('invitations').doc('invitation1').get()
      ).resolves.toBeDefined();
    });

    test('email matching is case-insensitive', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com')));

      await expect(
        testEnv.authenticatedContext('user1', { email: 'Meena@Example.com' }).firestore().collection('invitations').doc('invitation1').get()
      ).resolves.toBeDefined();
    });

    test('an authenticated user with a different email cannot read someone else\'s invitation', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com')));

      await expect(
        testEnv.authenticatedContext('user2', { email: 'stranger@example.com' }).firestore().collection('invitations').doc('invitation1').get()
      ).rejects.toThrow();
    });

    test('an active member of the event can read invitations for that event (People page)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'owner1')).set(eventMember('event1', 'owner1', 'active'));
        await adminDb.firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com'));
      });

      await expect(
        testEnv.authenticatedContext('owner1', { email: 'owner1@example.com' }).firestore().collection('invitations').doc('invitation1').get()
      ).resolves.toBeDefined();

      const snapshot = await testEnv.authenticatedContext('owner1', { email: 'owner1@example.com' }).firestore().collection('invitations').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(1);
    });

    test('a non-member with an unrelated email cannot read an event\'s invitations', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com')));

      await expect(
        testEnv.authenticatedContext('stranger1', { email: 'stranger@example.com' }).firestore().collection('invitations').doc('invitation1').get()
      ).rejects.toThrow();
    });

    test('client cannot create an invitation directly', async () => {
      await expect(
        testEnv.authenticatedContext('user1', { email: 'owner1@example.com' }).firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com'))
      ).rejects.toThrow();
    });

    test('client cannot update an invitation directly, e.g. to accept it themselves', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('invitations').doc('invitation1').set(invitation('event1', 'meena@example.com')));

      await expect(
        testEnv.authenticatedContext('user1', { email: 'meena@example.com' }).firestore().collection('invitations').doc('invitation1').update({ status: 'accepted' })
      ).rejects.toThrow();
    });

    test('client cannot create an eventMember directly, e.g. to accept an invitation without the Cloud Function', async () => {
      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'))
      ).rejects.toThrow();
    });
  });

  describe('Guests', () => {
    test('an active event member can read a guest for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).resolves.toBeDefined();
    });

    test('an active event member can list every guest for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Rajesh Patel'));
        await adminDb.firestore().collection('guests').doc('guest2').set(guest('event1', 'Meena Shah'));
        await adminDb.firestore().collection('guests').doc('guest3').set(guest('event2', 'Someone Else'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('guests').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });

    test('an unauthenticated user cannot read a guest', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('guests').doc('guest1').set(guest('event1')));

      await expect(testEnv.unauthenticatedContext().firestore().collection('guests').doc('guest1').get()).rejects.toThrow();
    });

    test('an inactive event member cannot read that event\'s guests', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).rejects.toThrow();
    });

    test('a member of a different event cannot read this event\'s guest (event isolation)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user1')).set(eventMember('event2', 'user1', 'active'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).rejects.toThrow();
    });

    test('a non-member cannot list guests for an event they do not belong to', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('guests').doc('guest1').set(guest('event1')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').where('eventId', '==', 'event1').get()).rejects.toThrow();
    });

    test('client cannot create a guest directly', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active')));

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').set(guest('event1'))
      ).rejects.toThrow();
    });

    test('client cannot update a guest directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').update({ status: 'confirmed' })
      ).rejects.toThrow();
    });

    test('client cannot delete a guest directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').delete()
      ).rejects.toThrow();
    });
  });

  // Step 12: guests are scoped for couple members (bride/groom) — their own
  // side plus "both". Owner/planner/family/staff/viewer keep full access.
  describe('Guests: bride/groom scoping', () => {
    test('a bride member can read a bride-side guest', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Rajesh Patel', 'bride'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).resolves.toBeDefined();
    });

    test('a bride member can read a both-side guest', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Family Friend', 'both'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).resolves.toBeDefined();
    });

    test('a bride member cannot read a groom-side guest', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Groom Friend', 'groom'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).rejects.toThrow();
    });

    test('a groom member can read groom and both guests, not a bride guest', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'groom'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Groom Friend', 'groom'));
        await adminDb.firestore().collection('guests').doc('guest2').set(guest('event1', 'Family Friend', 'both'));
        await adminDb.firestore().collection('guests').doc('guest3').set(guest('event1', 'Bride Friend', 'bride'));
      });

      const db = testEnv.authenticatedContext('user1').firestore();
      await expect(db.collection('guests').doc('guest1').get()).resolves.toBeDefined();
      await expect(db.collection('guests').doc('guest2').get()).resolves.toBeDefined();
      await expect(db.collection('guests').doc('guest3').get()).rejects.toThrow();
    });

    test('a bride member can list her scoped guests via two side-filtered queries', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Bride Friend', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest2').set(guest('event1', 'Family Friend', 'both'));
        await adminDb.firestore().collection('guests').doc('guest3').set(guest('event1', 'Groom Friend', 'groom'));
      });

      const db = testEnv.authenticatedContext('user1').firestore();
      const brideQuery = await db.collection('guests').where('eventId', '==', 'event1').where('side', '==', 'bride').get();
      const bothQuery = await db.collection('guests').where('eventId', '==', 'event1').where('side', '==', 'both').get();
      expect(brideQuery.docs).toHaveLength(1);
      expect(bothQuery.docs).toHaveLength(1);
    });

    test('a bride member cannot list guests for her event unfiltered by side', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Bride Friend', 'bride'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('guests').where('eventId', '==', 'event1').get()
      ).rejects.toThrow();
    });

    test('a bride member cannot query directly for groom-side guests', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'couple', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Groom Friend', 'groom'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('guests').where('eventId', '==', 'event1').where('side', '==', 'groom').get()
      ).rejects.toThrow();
    });

    test.each(['family', 'staff', 'viewer'])('a %s member can read guests of any side', async (role) => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', role));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Groom Friend', 'groom'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('guests').doc('guest1').get()).resolves.toBeDefined();
    });

    test.each(['owner', 'planner'])('an %s can read guests of any side, unfiltered', async (role) => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', role));
        await adminDb.firestore().collection('guests').doc('guest1').set(guest('event1', 'Bride Friend', 'bride'));
        await adminDb.firestore().collection('guests').doc('guest2').set(guest('event1', 'Groom Friend', 'groom'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('guests').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });
  });

  // Step 13: functions/ceremonies have no side-scoping — any active event
  // member may view every function for that event, regardless of role.
  describe('Functions', () => {
    test('an active event member can read a function for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').get()).resolves.toBeDefined();
    });

    test('an active event member can list every function for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1', 'Mehndi'));
        await adminDb.firestore().collection('functions').doc('function2').set(eventFunction('event1', 'Sangeet'));
        await adminDb.firestore().collection('functions').doc('function3').set(eventFunction('event2', 'Someone Else\'s Wedding'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('functions').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });

    test.each(['owner', 'planner', 'couple', 'family', 'staff', 'viewer'])(
      'a %s member can read functions (no side-scoping for this domain)',
      async (role) => {
        await seed(async (adminDb) => {
          await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', role));
          await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1'));
        });

        await expect(testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').get()).resolves.toBeDefined();
      }
    );

    test('an unauthenticated user cannot read a function', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1')));

      await expect(testEnv.unauthenticatedContext().firestore().collection('functions').doc('function1').get()).rejects.toThrow();
    });

    test('an inactive event member cannot read that event\'s functions', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
        await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').get()).rejects.toThrow();
    });

    test('a member of a different event cannot read this event\'s function (event isolation)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user1')).set(eventMember('event2', 'user1', 'active'));
        await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').get()).rejects.toThrow();
    });

    test('a non-member cannot list functions for an event they do not belong to', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('functions').where('eventId', '==', 'event1').get()).rejects.toThrow();
    });

    test('client cannot create a function directly', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active')));

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').set(eventFunction('event1'))
      ).rejects.toThrow();
    });

    test('client cannot update a function directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').update({ status: 'confirmed' })
      ).rejects.toThrow();
    });

    test('client cannot delete a function directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('functions').doc('function1').set(eventFunction('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('functions').doc('function1').delete()
      ).rejects.toThrow();
    });
  });

  // Step 14: expenses have no side-scoping — any active event member may
  // view every expense for that event, regardless of role. The event's
  // budgetAmount lives on the event document itself, so it is already
  // covered by the existing Events describe block above.
  describe('Expenses', () => {
    test('an active event member can read an expense for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').get()).resolves.toBeDefined();
    });

    test('an active event member can list every expense for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1', 'Venue Booking'));
        await adminDb.firestore().collection('expenses').doc('expense2').set(expense('event1', 'Catering'));
        await adminDb.firestore().collection('expenses').doc('expense3').set(expense('event2', 'Someone Else\'s Expense'));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('expenses').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });

    test.each(['owner', 'planner', 'couple', 'family', 'staff', 'viewer'])(
      'a %s member can read expenses (no side-scoping for this domain)',
      async (role) => {
        await seed(async (adminDb) => {
          await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', role));
          await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1'));
        });

        await expect(testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').get()).resolves.toBeDefined();
      }
    );

    test('an unauthenticated user cannot read an expense', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1')));

      await expect(testEnv.unauthenticatedContext().firestore().collection('expenses').doc('expense1').get()).rejects.toThrow();
    });

    test('an inactive event member cannot read that event\'s expenses', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
        await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').get()).rejects.toThrow();
    });

    test('a member of a different event cannot read this event\'s expense (event isolation)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user1')).set(eventMember('event2', 'user1', 'active'));
        await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').get()).rejects.toThrow();
    });

    test('a non-member cannot list expenses for an event they do not belong to', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('expenses').where('eventId', '==', 'event1').get()).rejects.toThrow();
    });

    test('client cannot create an expense directly', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active')));

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').set(expense('event1'))
      ).rejects.toThrow();
    });

    test('client cannot update an expense directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').update({ paymentStatus: 'paid' })
      ).rejects.toThrow();
    });

    test('client cannot delete an expense directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('expenses').doc('expense1').set(expense('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('expenses').doc('expense1').delete()
      ).rejects.toThrow();
    });

    test('client cannot set the event budget directly (budgetAmount lives on the event document)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('events').doc('event1').set(event());
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('events').doc('event1').update({ budgetAmount: 999999 })
      ).rejects.toThrow();
    });
  });

  // Step 15: vendors have no side-scoping — any active event member may
  // view every vendor for that event, regardless of role.
  describe('Vendors', () => {
    test('an active event member can read a vendor for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').get()).resolves.toBeDefined();
    });

    test('an active event member can list every vendor for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1', 'Royal Caterers'));
        await adminDb.firestore().collection('vendors').doc('vendor2').set(vendor('event1', 'Dream Decor'));
        await adminDb.firestore().collection('vendors').doc('vendor3').set(vendor('event2', "Someone Else's Vendor"));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('vendors').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });

    test.each(['owner', 'planner', 'couple', 'family', 'staff', 'viewer'])(
      'a %s member can read vendors (no side-scoping for this domain)',
      async (role) => {
        await seed(async (adminDb) => {
          await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', role));
          await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1'));
        });

        await expect(testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').get()).resolves.toBeDefined();
      }
    );

    test('an unauthenticated user cannot read a vendor', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1')));

      await expect(testEnv.unauthenticatedContext().firestore().collection('vendors').doc('vendor1').get()).rejects.toThrow();
    });

    test('an inactive event member cannot read that event\'s vendors', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
        await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').get()).rejects.toThrow();
    });

    test('a member of a different event cannot read this event\'s vendor (event isolation)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user1')).set(eventMember('event2', 'user1', 'active'));
        await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').get()).rejects.toThrow();
    });

    test('a non-member cannot list vendors for an event they do not belong to', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('vendors').where('eventId', '==', 'event1').get()).rejects.toThrow();
    });

    test('client cannot create a vendor directly', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active')));

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').set(vendor('event1'))
      ).rejects.toThrow();
    });

    test('client cannot update a vendor directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').update({ status: 'confirmed' })
      ).rejects.toThrow();
    });

    test('client cannot delete a vendor directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('vendors').doc('vendor1').set(vendor('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('vendors').doc('vendor1').delete()
      ).rejects.toThrow();
    });
  });

  // Step 15: tasks have no side-scoping for reads — any active event
  // member may view every task for that event. Who may *write* differs by
  // role (owner/planner any task, staff only their own assigned task),
  // but that authorization lives in the Cloud Functions
  // (functions/src/tasks/authorization.ts), not the Firestore rule — the
  // rule denies all client writes outright, same as every other domain.
  describe('Tasks', () => {
    test('an active event member can read a task for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('tasks').doc('task1').set(task('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').get()).resolves.toBeDefined();
    });

    test('an active event member can list every task for their event', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('tasks').doc('task1').set(task('event1', 'Book the venue'));
        await adminDb.firestore().collection('tasks').doc('task2').set(task('event1', 'Send invitations'));
        await adminDb.firestore().collection('tasks').doc('task3').set(task('event2', "Someone Else's Task"));
      });

      const snapshot = await testEnv.authenticatedContext('user1').firestore().collection('tasks').where('eventId', '==', 'event1').get();
      expect(snapshot.docs).toHaveLength(2);
    });

    test.each(['owner', 'planner', 'couple', 'family', 'staff', 'viewer'])(
      'a %s member can read tasks (no side-scoping for reads)',
      async (role) => {
        await seed(async (adminDb) => {
          await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', role));
          await adminDb.firestore().collection('tasks').doc('task1').set(task('event1'));
        });

        await expect(testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').get()).resolves.toBeDefined();
      }
    );

    test('an unauthenticated user cannot read a task', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('tasks').doc('task1').set(task('event1')));

      await expect(testEnv.unauthenticatedContext().firestore().collection('tasks').doc('task1').get()).rejects.toThrow();
    });

    test('an inactive event member cannot read that event\'s tasks', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'inactive'));
        await adminDb.firestore().collection('tasks').doc('task1').set(task('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').get()).rejects.toThrow();
    });

    test('a member of a different event cannot read this event\'s task (event isolation)', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event2', 'user1')).set(eventMember('event2', 'user1', 'active'));
        await adminDb.firestore().collection('tasks').doc('task1').set(task('event1'));
      });

      await expect(testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').get()).rejects.toThrow();
    });

    test('a non-member cannot list tasks for an event they do not belong to', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('tasks').doc('task1').set(task('event1')));

      await expect(testEnv.authenticatedContext('user1').firestore().collection('tasks').where('eventId', '==', 'event1').get()).rejects.toThrow();
    });

    test('client cannot create a task directly', async () => {
      await seed(async (adminDb) => adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active')));

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').set(task('event1'))
      ).rejects.toThrow();
    });

    test('client cannot update a task directly, e.g. to mark it complete themselves', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active', 'staff'));
        await adminDb.firestore().collection('tasks').doc('task1').set({ ...task('event1'), assignedTo: 'user1' });
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').update({ status: 'completed' })
      ).rejects.toThrow();
    });

    test('client cannot delete a task directly', async () => {
      await seed(async (adminDb) => {
        await adminDb.firestore().collection('eventMembers').doc(eventMembershipId('event1', 'user1')).set(eventMember('event1', 'user1', 'active'));
        await adminDb.firestore().collection('tasks').doc('task1').set(task('event1'));
      });

      await expect(
        testEnv.authenticatedContext('user1').firestore().collection('tasks').doc('task1').delete()
      ).rejects.toThrow();
    });
  });
});
