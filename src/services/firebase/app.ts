import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/services/firebase/config';

const app = initializeApp(firebaseConfig);

export { app };
