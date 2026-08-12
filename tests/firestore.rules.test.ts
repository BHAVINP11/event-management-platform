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

const eventMember = (eventId: string, userId: string, status: string) => ({
  id: eventMembershipId(eventId, userId),
  eventId,
  userId,
  role: 'owner',
  status,
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
});
