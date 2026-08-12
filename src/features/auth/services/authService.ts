import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, deleteUser, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/services/firebase/auth';
import { User } from '@/types/user';
import { createUserProfile, getUserProfile } from '@/features/auth/services/userProfileService';
import { SignUpPayload, SignInPayload } from '@/features/auth/types/auth';

const mapFirebaseUserToAuthUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const profile = await getUserProfile(firebaseUser.uid);
  if (!profile) {
    throw new Error('User profile not found');
  }
  return profile;
};

export const signUp = async (payload: SignUpPayload): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  const firebaseUser = userCredential.user;

  const now = new Date().toISOString();

  const userProfile: User = {
    id: firebaseUser.uid,
    firstName: payload.firstName,
    lastName: payload.lastName,
    displayName: `${payload.firstName} ${payload.lastName}`,
    email: payload.email,
    phone: undefined,
    avatarUrl: undefined,
    createdAt: now,
    updatedAt: now
  };

  try {
    await createUserProfile(firebaseUser.uid, userProfile);
  } catch (error) {
    await deleteUser(firebaseUser);
    throw error;
  }

  return userProfile;
};

export const signIn = async (payload: SignInPayload): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, payload.email, payload.password);
  return mapFirebaseUserToAuthUser(userCredential.user);
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const subscribeToAuthState = (callback: (user: User | null) => void): ReturnType<typeof onAuthStateChanged> => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    try {
      const appUser = await mapFirebaseUserToAuthUser(firebaseUser);
      callback(appUser);
    } catch {
      callback(null);
    }
  });
};
