import { getStorage } from 'firebase/storage';
import { app } from '@/services/firebase/app';

export const storage = getStorage(app);
