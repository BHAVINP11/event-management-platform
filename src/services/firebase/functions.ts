import { getFunctions } from 'firebase/functions';
import { app } from '@/services/firebase/app';

export const functions = getFunctions(app);

// In development, connect to the Functions emulator
if (process.env.NODE_ENV === 'development') {
  // Emulator will be started by firebase emulators:start
  // Functions will automatically connect when running in dev
}
