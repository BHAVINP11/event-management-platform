import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'event-management-test',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8')
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  describe('User Profile Rules', () => {
    test('Unauthenticated user cannot read another user profile', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      const docRef = unauthedDb.collection('users').doc('user1');

      await expect(docRef.get()).rejects.toThrow();
    });

    test('User can read their own profile', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('users').doc('user1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('users').doc('user1').set({
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const doc = await docRef.get();
      expect(doc.exists).toBe(true);
    });

    test('User cannot update another user profile', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('users').doc('user2');

      await expect(docRef.update({ firstName: 'Hacked' })).rejects.toThrow();
    });

    test('User can create their own profile', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('users').doc('user1');

      await expect(
        docRef.set({
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('Organization Rules', () => {
    test('User cannot read organization they are not member of', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('organizations').doc('org1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('organizations').doc('org1').set({
          id: 'org1',
          name: 'Test Org',
          slug: 'test-org',
          contactEmail: 'contact@org.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await expect(docRef.get()).rejects.toThrow();
    });

    test('Active organization member can read organization', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const orgDocRef = db.collection('organizations').doc('org1');
      const memberDocRef = db.collection('organizationMembers').doc('member1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('organizations').doc('org1').set({
          id: 'org1',
          name: 'Test Org',
          slug: 'test-org',
          contactEmail: 'contact@org.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await adminDb.collection('organizationMembers').doc('member1').set({
          id: 'member1',
          organizationId: 'org1',
          userId: 'user1',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const doc = await orgDocRef.get();
      expect(doc.exists).toBe(true);
    });

    test('User cannot arbitrarily write to organizations', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('organizations').doc('org1');

      await expect(
        docRef.set({
          id: 'org1',
          name: 'Hacked Org',
          slug: 'hacked',
          contactEmail: 'hack@org.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ).rejects.toThrow();
    });
  });

  describe('Organization Membership Rules', () => {
    test('User can read their own organization membership', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('organizationMembers').doc('member1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('organizationMembers').doc('member1').set({
          id: 'member1',
          organizationId: 'org1',
          userId: 'user1',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const doc = await docRef.get();
      expect(doc.exists).toBe(true);
    });

    test('User cannot arbitrarily create organization memberships', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('organizationMembers').doc('member1');

      await expect(
        docRef.set({
          id: 'member1',
          organizationId: 'org1',
          userId: 'user1',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ).rejects.toThrow();
    });
  });

  describe('Event Rules', () => {
    test('User cannot read event they are not member of', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('events').doc('event1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('events').doc('event1').set({
          id: 'event1',
          name: 'Test Event',
          type: 'wedding',
          createdBy: 'user2',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await expect(docRef.get()).rejects.toThrow();
    });

    test('Active event member can read event', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const eventDocRef = db.collection('events').doc('event1');
      const memberDocRef = db.collection('eventMembers').doc('member1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('events').doc('event1').set({
          id: 'event1',
          name: 'Test Event',
          type: 'wedding',
          createdBy: 'user1',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await adminDb.collection('eventMembers').doc('member1').set({
          id: 'member1',
          eventId: 'event1',
          userId: 'user1',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const doc = await eventDocRef.get();
      expect(doc.exists).toBe(true);
    });

    test('Inactive event member cannot read event', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const eventDocRef = db.collection('events').doc('event1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('events').doc('event1').set({
          id: 'event1',
          name: 'Test Event',
          type: 'wedding',
          createdBy: 'user2',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await adminDb.collection('eventMembers').doc('member1').set({
          id: 'member1',
          eventId: 'event1',
          userId: 'user1',
          role: 'owner',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await expect(eventDocRef.get()).rejects.toThrow();
    });

    test('User cannot arbitrarily write to events', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('events').doc('event1');

      await expect(
        docRef.set({
          id: 'event1',
          name: 'Hacked Event',
          type: 'wedding',
          createdBy: 'user1',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ).rejects.toThrow();
    });
  });

  describe('Event Membership Rules', () => {
    test('User can read their own event membership', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('eventMembers').doc('member1');

      await testEnv.withSecurityRulesDisabled(async (adminDb) => {
        await adminDb.collection('eventMembers').doc('member1').set({
          id: 'member1',
          eventId: 'event1',
          userId: 'user1',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const doc = await docRef.get();
      expect(doc.exists).toBe(true);
    });

    test('User cannot arbitrarily create event memberships', async () => {
      const db = testEnv.authenticatedContext('user1').firestore();
      const docRef = db.collection('eventMembers').doc('member1');

      await expect(
        docRef.set({
          id: 'member1',
          eventId: 'event1',
          userId: 'user1',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ).rejects.toThrow();
    });
  });
});
