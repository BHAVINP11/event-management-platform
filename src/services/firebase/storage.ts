import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { app } from '@/services/firebase/app';

export const storage = getStorage(app);

// Local development only: point Storage at the emulator instead of the
// real project. `globalThis` (not a module-level flag) survives Vite HMR
// re-executing this module, so a hot reload can't attempt to connect the
// same `storage` instance to the emulator twice.
const globalForEmulators = globalThis as typeof globalThis & { __FIREBASE_STORAGE_EMULATOR_CONNECTED__?: boolean };

if (import.meta.env.DEV && !globalForEmulators.__FIREBASE_STORAGE_EMULATOR_CONNECTED__) {
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  globalForEmulators.__FIREBASE_STORAGE_EMULATOR_CONNECTED__ = true;
}
