import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDiFV21hQk6wSoiR4Jqwuiij1mGQOVBk0s';
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'danix-pos-lk-2026';

// Validate if Firebase configuration has valid credentials
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  rawProjectId &&
  !rawApiKey.includes('your_api_key') &&
  !rawProjectId.includes('your_project_id') &&
  !rawApiKey.includes('Placeholder') &&
  !rawApiKey.includes('Demo')
);

const firebaseConfig = {
  apiKey: rawApiKey || 'demo-danix-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'danix-pos-lk-2026.firebaseapp.com',
  projectId: rawProjectId || 'danix-pos-lk-2026',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'danix-pos-lk-2026.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029375514948',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1029375514948:web:47ce8d97389b84c77a9f11',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase App gracefully (singleton)
let app: FirebaseApp;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('[Firebase] Initialization fallback invoked:', error);
    app = initializeApp({
      apiKey: 'demo-danix-key',
      authDomain: 'danix-pos.firebaseapp.com',
      projectId: 'danix-pos-demo',
      storageBucket: 'danix-pos-demo.appspot.com',
      messagingSenderId: '1234567890',
      appId: '1:1234567890:web:demo',
    });
  }
} else {
  app = getApp();
}

// Export instances with persistent local cache enabled to avoid Firestore read limits
export const auth: Auth = getAuth(app);

function createOptimizedFirestore(firebaseApp: FirebaseApp): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // If Firestore was already initialized or localCache is unsupported in environment
    return getFirestore(firebaseApp);
  }
}

export const db: Firestore = createOptimizedFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Connect to Emulators if requested
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator && typeof window !== 'undefined') {
  try {
    // Only connect if not already connected
    if (!(auth as unknown as { _emulatorConnected?: boolean })._emulatorConnected) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      (auth as unknown as { _emulatorConnected?: boolean })._emulatorConnected = true;
    }
  } catch {
    // Ignore emulator re-connection error
  }

  try {
    if (!(db as unknown as { _emulatorConnected?: boolean })._emulatorConnected) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      (db as unknown as { _emulatorConnected?: boolean })._emulatorConnected = true;
    }
  } catch {
    // Ignore emulator re-connection error
  }

  try {
    if (!(storage as unknown as { _emulatorConnected?: boolean })._emulatorConnected) {
      connectStorageEmulator(storage, 'localhost', 9199);
      (storage as unknown as { _emulatorConnected?: boolean })._emulatorConnected = true;
    }
  } catch {
    // Ignore emulator re-connection error
  }
}

export default app;
