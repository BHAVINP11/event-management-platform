interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const getEnv = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const getRequiredEnv = (key: string): string => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const firebaseEnv: FirebaseEnv = {
  apiKey: getRequiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredEnv('VITE_FIREBASE_APP_ID')
};

export const isFirebaseConfigured = (): boolean => {
  try {
    getRequiredEnv('VITE_FIREBASE_API_KEY');
    getRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN');
    getRequiredEnv('VITE_FIREBASE_PROJECT_ID');
    getRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET');
    getRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
    getRequiredEnv('VITE_FIREBASE_APP_ID');
    return true;
  } catch {
    return false;
  }
};
