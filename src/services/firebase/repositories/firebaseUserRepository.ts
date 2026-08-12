import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { User } from '@/types/user';
import { UserRepository } from '@/repositories/interfaces/userRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import { getRequiredString, getOptionalString } from '@/services/firebase/repositories/firestoreMapping';

const usersCollection = 'users';

const mapUserToFirestore = (user: User): Record<string, unknown> => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  displayName: user.displayName,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const mapFirestoreToUser = (userId: string, data: Record<string, unknown>): User => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid user document.');
  }

  return {
    id: userId,
    firstName: getRequiredString(data.firstName, 'firstName'),
    lastName: getRequiredString(data.lastName, 'lastName'),
    displayName: getRequiredString(data.displayName, 'displayName'),
    email: getRequiredString(data.email, 'email'),
    phone: getOptionalString(data.phone),
    avatarUrl: getOptionalString(data.avatarUrl),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

export class FirebaseUserRepository implements UserRepository {
  private collectionPath = collection(firestore, usersCollection);

  async getById(userId: string): Promise<User | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, userId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToUser(userId, snapshot.data());
    } catch (error) {
      throw new RepositoryInfrastructureError('Failed to load user profile.');
    }
  }

  async create(user: User): Promise<User> {
    try {
      await setDoc(doc(this.collectionPath, user.id), mapUserToFirestore(user));
      return user;
    } catch (error) {
      throw new RepositoryInfrastructureError('Failed to create user profile.');
    }
  }

  async update(user: User): Promise<User> {
    try {
      const ref = doc(this.collectionPath, user.id);
      await updateDoc(ref, mapUserToFirestore(user));
      return user;
    } catch (error) {
      throw new RepositoryInfrastructureError('Failed to update user profile.');
    }
  }
}
