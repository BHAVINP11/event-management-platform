import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { app } from '@/services/firebase/app';

export const firestore = getFirestore(app);

// Local development only: point Firestore at the emulator instead of the
// real project. `globalThis` (not a module-level flag) survives Vite HMR
// re-executing this module, so a hot reload can't attempt to connect the
// same `firestore` instance to the emulator twice.
const globalForEmulators = globalThis as typeof globalThis & { __FIREBASE_FIRESTORE_EMULATOR_CONNECTED__?: boolean };

if (import.meta.env.DEV && !globalForEmulators.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__) {
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  globalForEmulators.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__ = true;
}
