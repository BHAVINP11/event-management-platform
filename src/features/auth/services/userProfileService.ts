import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore } from '@/services/firebase/firestore';
import { storage } from '@/services/firebase/storage';
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

export interface UserProfileUpdate {
  firstName: string;
  lastName: string;
  displayName: string;
  /** Empty string means "no phone" — mirrors how `mapFirestoreUserToUser` already treats an empty string as absent. */
  phone: string;
}

/**
 * Updates the caller's own name/phone. Firestore rules (`users/{userId}`)
 * already permit a user to directly write their own profile document
 * (the only domain in this app architected that way), so this is a plain
 * `updateDoc` — no Cloud Function needed. Email is never included here:
 * changing it would require Firebase Auth's own re-authentication/
 * verification flow, which this pass deliberately does not build (see
 * the final report).
 */
export const updateUserProfile = async (userId: string, update: UserProfileUpdate): Promise<void> => {
  const docRef = doc(firestore, usersCollection, userId);

  try {
    await updateDoc(docRef, {
      firstName: update.firstName,
      lastName: update.lastName,
      displayName: update.displayName,
      phone: update.phone,
      updatedAt: new Date().toISOString()
    });
  } catch {
    throw new Error('Unable to update your profile.');
  }
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const sanitizeFileName = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Extracts the Storage object path from a Firebase Storage download URL.
 * A small, deliberate duplicate of the same helper in
 * `functions/src/events/updateEventCoverImage.ts` — client and Cloud
 * Functions code are separate packages/bundles (see
 * `src/repositories/membershipIds.ts` / `functions/src/shared/
 * membershipIds.ts` for the same established precedent), so there is
 * nowhere shared to put this instead.
 */
const extractStoragePathFromDownloadUrl = (url: string): string | null => {
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

const updateAvatarUrl = async (userId: string, avatarUrl: string): Promise<void> => {
  const docRef = doc(firestore, usersCollection, userId);

  try {
    await updateDoc(docRef, { avatarUrl, updatedAt: new Date().toISOString() });
  } catch {
    throw new Error('Unable to update your avatar.');
  }
};

/**
 * Validates, uploads to Storage (gated by `storage.rules`' own
 * owner-only check), and persists the resulting URL onto the user's own
 * profile document. Returns the new avatar URL.
 */
export const uploadUserAvatar = async (userId: string, file: File): Promise<string> => {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, or WEBP image.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Please choose an image under 5 MB.');
  }

  const path = `user-avatars/${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const avatarUrl = await getDownloadURL(storageRef);
  await updateAvatarUrl(userId, avatarUrl);
  return avatarUrl;
};

/** Removes the current avatar, deleting its Storage object (best-effort — a missing file must not fail the removal). */
export const removeUserAvatar = async (userId: string, currentAvatarUrl: string | undefined): Promise<void> => {
  await updateAvatarUrl(userId, '');

  const path = currentAvatarUrl ? extractStoragePathFromDownloadUrl(currentAvatarUrl) : null;
  if (path && path.startsWith(`user-avatars/${userId}/`)) {
    try {
      await deleteObject(ref(storage, path));
    } catch {
      // Best-effort cleanup only.
    }
  }
};
