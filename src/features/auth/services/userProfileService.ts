import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { User } from '@/types/user';

const usersCollection = 'users';

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const docRef = doc(firestore, usersCollection, userId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as User;
};

export const createUserProfile = async (userId: string, profile: User): Promise<void> => {
  const docRef = doc(firestore, usersCollection, userId);
  await setDoc(docRef, profile);
};
