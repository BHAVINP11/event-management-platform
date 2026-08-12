import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { User } from '@/types/user';

const usersCollection = 'users';

type FirestoreUserRecord = Record<string, unknown>;

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export class UserProfileNotFoundError extends Error {
  readonly type = 'not-found';

  constructor() {
    super('User profile not found');
    this.name = 'UserProfileNotFoundError';
  }
}

export class UserProfileInvalidError extends Error {
  readonly type = 'invalid';

  constructor(message = 'User profile data is invalid') {
    super(message);
    this.name = 'UserProfileInvalidError';
  }
}

export class UserProfileInfrastructureError extends Error {
  readonly type = 'infrastructure';

  constructor(message = 'Unable to load user profile') {
    super(message);
    this.name = 'UserProfileInfrastructureError';
  }
}

const mapFirestoreUserToUser = (data: unknown, userId: string): User => {
  if (!data || typeof data !== 'object') {
    throw new UserProfileInvalidError('User profile document is malformed.');
  }

  const record = data as FirestoreUserRecord;
  const firstName = record.firstName;
  const lastName = record.lastName;
  const displayName = record.displayName;
  const email = record.email;
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;
  const phone = record.phone;
  const avatarUrl = record.avatarUrl;
  const documentId = record.id;

  if (
    !isString(firstName) ||
    !isString(lastName) ||
    !isString(displayName) ||
    !isString(email) ||
    !isString(createdAt) ||
    !isString(updatedAt)
  ) {
    throw new UserProfileInvalidError('User profile document is missing required fields.');
  }

  if (documentId !== undefined && documentId !== userId) {
    throw new UserProfileInvalidError('Stored profile id does not match document path.');
  }

  return {
    id: userId,
    firstName,
    lastName,
    displayName,
    email,
    phone: isString(phone) ? phone : undefined,
    avatarUrl: isString(avatarUrl) ? avatarUrl : undefined,
    createdAt,
    updatedAt
  };
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const docRef = doc(firestore, usersCollection, userId);

  try {
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return mapFirestoreUserToUser(snapshot.data(), userId);
  } catch (error) {
    if (error instanceof UserProfileInvalidError) {
      throw error;
    }

    throw new UserProfileInfrastructureError();
  }
};

export const createUserProfile = async (userId: string, profile: User): Promise<void> => {
  const docRef = doc(firestore, usersCollection, userId);

  try {
    await setDoc(docRef, profile);
  } catch {
    throw new Error('Unable to create user profile.');
  }
};
