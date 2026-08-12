import { getAuth } from 'firebase/auth';
import { app } from '@/services/firebase/app';

export const auth = getAuth(app);
