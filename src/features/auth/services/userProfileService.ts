import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { User } from '@/types/user';

const usersCollection = 'users';

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const mapFirestoreUserToUser = (data: unknown, userId: string): User | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
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
    return null;
  }

  if (documentId !== undefined && documentId !== userId) {
    return null;
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
  } catch {
    throw new Error('Unable to load user profile.');
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
