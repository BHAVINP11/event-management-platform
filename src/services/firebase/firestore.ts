import { getFirestore } from 'firebase/firestore';
import { app } from '@/services/firebase/app';

export const firestore = getFirestore(app);
