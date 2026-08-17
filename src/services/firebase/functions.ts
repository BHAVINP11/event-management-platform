import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { app } from '@/services/firebase/app';

export const functions = getFunctions(app);

// Local development only: point Functions at the emulator instead of the
// real project. This does NOT happen automatically — `getFunctions(app)`
// always targets the real deployed functions unless explicitly connected
// to the emulator, which is what this block does. `globalThis` (not a
// module-level flag) survives Vite HMR re-executing this module, so a hot
// reload can't attempt to connect the same `functions` instance to the
// emulator twice.
const globalForEmulators = globalThis as typeof globalThis & { __FIREBASE_FUNCTIONS_EMULATOR_CONNECTED__?: boolean };

if (import.meta.env.DEV && !globalForEmulators.__FIREBASE_FUNCTIONS_EMULATOR_CONNECTED__) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  globalForEmulators.__FIREBASE_FUNCTIONS_EMULATOR_CONNECTED__ = true;
}
