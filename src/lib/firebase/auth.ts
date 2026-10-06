import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';
import { User, UserRole } from '@/types';

// Mock/Demo users when real Firebase API keys are not yet configured
export const DEMO_USERS: Record<string, User> = {
  'demo-admin-uid': {
    uid: 'demo-admin-uid',
    name: 'Danix Super Admin',
    email: 'admin@danix.lk',
    role: 'admin',
    active: true,
    phone: '+94 77 123 4567',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  'demo-staff-uid': {
    uid: 'demo-staff-uid',
    name: 'Danix Counter Staff',
    email: 'staff@danix.lk',
    role: 'staff',
    active: true,
    phone: '+94 71 987 6543',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
};

/**
 * Sign in user with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential | { user: { uid: string; email: string; displayName: string } }> {
  // If demo credentials or Firebase not configured, provide local fallback
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!isFirebaseConfigured || normalizedEmail === 'admin@danix.lk' || normalizedEmail === 'staff@danix.lk') {
    if (normalizedEmail === 'admin@danix.lk' && password.length >= 6) {
      localStorage.setItem('danix_demo_user', 'demo-admin-uid');
      return {
        user: {
          uid: 'demo-admin-uid',
          email: 'admin@danix.lk',
          displayName: 'Danix Super Admin',
        },
      };
    }
    if (normalizedEmail === 'staff@danix.lk' && password.length >= 6) {
      localStorage.setItem('danix_demo_user', 'demo-staff-uid');
      return {
        user: {
          uid: 'demo-staff-uid',
          email: 'staff@danix.lk',
          displayName: 'Danix Counter Staff',
        },
      };
    }
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential;
  } catch (error: unknown) {
    // If Firebase error is api-key-not-valid, fallback gracefully if demo user
    const firebaseError = error as { code?: string; message?: string };
    if (!isFirebaseConfigured || firebaseError?.code === 'auth/api-key-not-valid') {
      if (normalizedEmail.includes('admin')) {
        localStorage.setItem('danix_demo_user', 'demo-admin-uid');
        return {
          user: {
            uid: 'demo-admin-uid',
            email: normalizedEmail,
            displayName: 'Danix Admin (Demo)',
          },
        };
      }
      localStorage.setItem('danix_demo_user', 'demo-staff-uid');
      return {
        user: {
          uid: 'demo-staff-uid',
          email: normalizedEmail,
          displayName: 'Danix Staff (Demo)',
        },
      };
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem('danix_demo_user');
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('[Auth] Sign out error or demo mode:', error);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured) {
    console.info(`[Auth Demo] Password reset link simulated for ${email}`);
    return;
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Retrieve user profile from Firestore `users/{uid}`
 */
export async function getCurrentUserProfile(uid: string): Promise<User | null> {
  // Check demo user
  if (DEMO_USERS[uid]) {
    return DEMO_USERS[uid];
  }

  const demoStored = localStorage.getItem('danix_demo_user');
  if (demoStored && DEMO_USERS[demoStored] && uid === demoStored) {
    return DEMO_USERS[demoStored];
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data() as User;
    }

    // If doc doesn't exist, check if current auth user exists
    const current = auth.currentUser;
    if (current && current.uid === uid) {
      const fallbackUser: User = {
        uid: current.uid,
        name: current.displayName || current.email?.split('@')[0] || 'User',
        email: current.email || '',
        role: current.email?.includes('admin') ? 'admin' : 'staff',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Auto-provision Firestore document if configured
      if (isFirebaseConfigured) {
        try {
          await setDoc(userDocRef, fallbackUser);
        } catch {
          // ignore doc creation error
        }
      }
      return fallbackUser;
    }

    return null;
  } catch (error) {
    console.warn('[Auth] Error fetching user profile:', error);
    // Graceful fallback for demo/unconfigured states
    return {
      uid,
      name: 'Danix User',
      email: auth.currentUser?.email || 'user@danix.lk',
      role: 'admin',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

/**
 * Create a new user account and save to Firestore
 */
export async function createUserAccount(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  if (!isFirebaseConfigured) {
    const newUid = `user-${Date.now()}`;
    const newUser: User = {
      uid: newUid,
      name,
      email,
      role,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return newUser;
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (credential.user) {
    await updateProfile(credential.user, { displayName: name });
  }

  const newUser: User = {
    uid: credential.user.uid,
    name,
    email: credential.user.email || email,
    role,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, 'users', credential.user.uid), newUser);
  return newUser;
}
