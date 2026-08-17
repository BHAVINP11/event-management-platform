import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, deleteUser, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/services/firebase/auth';
import { User } from '@/types/user';
import {
  createUserProfile,
  getUserProfile,
  UserProfileInfrastructureError,
  UserProfileInvalidError,
  UserProfileNotFoundError
} from '@/features/auth/services/userProfileService';
import { SignUpPayload, SignInPayload } from '@/features/auth/types/auth';

export type AuthProfileError = {
  kind: 'profileInvalid' | 'profileInfrastructure';
  message: string;
};

export type AuthSubscriptionState = {
  user: User | null;
  isAuthenticated: boolean;
  profileError: AuthProfileError | null;
};

const mapFirebaseUserToAuthUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const profile = await getUserProfile(firebaseUser.uid);
  if (!profile) {
    throw new UserProfileNotFoundError();
  }
  return profile;
};

const signOutForMissingProfile = async (): Promise<void> => {
  await firebaseSignOut(auth);
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

  try {
    return await mapFirebaseUserToAuthUser(userCredential.user);
  } catch (error) {
    if (error instanceof UserProfileNotFoundError) {
      await signOutForMissingProfile();
    }
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const subscribeToAuthState = (callback: (state: AuthSubscriptionState) => void): ReturnType<typeof onAuthStateChanged> => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback({ user: null, isAuthenticated: false, profileError: null });
      return;
    }

    try {
      const appUser = await mapFirebaseUserToAuthUser(firebaseUser);
      callback({ user: appUser, isAuthenticated: true, profileError: null });
    } catch (error) {
      if (error instanceof UserProfileNotFoundError) {
        await signOutForMissingProfile();
        callback({ user: null, isAuthenticated: false, profileError: null });
        return;
      }

      if (error instanceof UserProfileInvalidError) {
        callback({
          user: null,
          isAuthenticated: true,
          profileError: {
            kind: 'profileInvalid',
            message: 'Your profile data is invalid. Please contact support.'
          }
        });
        return;
      }

      if (error instanceof UserProfileInfrastructureError) {
        callback({
          user: null,
          isAuthenticated: true,
          profileError: {
            kind: 'profileInfrastructure',
            message: 'Unable to load profile data. Please check your connection and try again.'
          }
        });
        return;
      }

      callback({
        user: null,
        isAuthenticated: true,
        profileError: {
          kind: 'profileInfrastructure',
          message: 'Unable to load profile data. Please try again.'
        }
      });
    }
  });
};
