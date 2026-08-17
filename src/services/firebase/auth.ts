import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { app } from '@/services/firebase/app';

export const auth = getAuth(app);

// Local development only: point Auth at the emulator instead of the real
// project. `globalThis` (not a module-level flag) survives Vite HMR
// re-executing this module, so a hot reload can't attempt to connect the
// same `auth` instance to the emulator twice.
const globalForEmulators = globalThis as typeof globalThis & { __FIREBASE_AUTH_EMULATOR_CONNECTED__?: boolean };

if (import.meta.env.DEV && !globalForEmulators.__FIREBASE_AUTH_EMULATOR_CONNECTED__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  globalForEmulators.__FIREBASE_AUTH_EMULATOR_CONNECTED__ = true;
}
