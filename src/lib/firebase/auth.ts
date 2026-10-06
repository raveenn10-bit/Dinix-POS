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

/**
 * Sign in user with email and password via Firebase Authentication
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserCredential | { user: { uid: string; email: string; displayName: string } }> {
  const trimmedEmail = email.trim();

  // If Firebase is configured with credentials, perform real authentication
  try {
    const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    return credential;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    
    // Check if the error is due to unconfigured/placeholder Firebase project
    if (firebaseError?.code === 'auth/api-key-not-valid' || !isFirebaseConfigured) {
      // Check local users store for offline or initial administrator credentials
      const localUsersRaw = localStorage.getItem('danix_pos_users');
      if (localUsersRaw) {
        try {
          const localUsers: User[] = JSON.parse(localUsersRaw);
          const found = localUsers.find(
            (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase() && u.active
          );
          if (found) {
            localStorage.setItem('danix_auth_session', JSON.stringify(found));
            return {
              user: {
                uid: found.uid,
                email: found.email,
                displayName: found.name,
              },
            };
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    
    // Re-throw genuine authentication error to be handled cleanly by the UI
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem('danix_auth_session');
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('[Auth] Sign out error:', error);
  }
}

/**
 * Send password reset email via Firebase Auth
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Retrieve user profile from Firestore `users/{uid}`
 */
export async function getCurrentUserProfile(uid: string): Promise<User | null> {
  // Check local active session first if offline/initial
  const storedSession = localStorage.getItem('danix_auth_session');
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession) as User;
      if (parsed.uid === uid) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data() as User;
    }

    // If Firestore document doesn't exist yet, auto-provision from Auth record
    const current = auth.currentUser;
    if (current && current.uid === uid) {
      const fallbackUser: User = {
        uid: current.uid,
        name: current.displayName || current.email?.split('@')[0] || 'Administrator',
        email: current.email || '',
        role: current.email?.toLowerCase().includes('admin') ? 'admin' : 'staff',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (isFirebaseConfigured) {
        try {
          await setDoc(userDocRef, fallbackUser);
        } catch (err) {
          console.warn('[Auth] Could not write user doc to Firestore:', err);
        }
      }
      return fallbackUser;
    }

    return null;
  } catch (error) {
    console.warn('[Auth] Error fetching user profile:', error);
    return null;
  }
}

/**
 * Register First Super Admin (Initial System Setup)
 */
export async function registerFirstAdmin(
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<User> {
  const trimmedEmail = email.trim();

  try {
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    if (credential.user) {
      await updateProfile(credential.user, { displayName: name });
    }

    const adminUser: User = {
      uid: credential.user.uid,
      name,
      email: credential.user.email || trimmedEmail,
      phone: phone || '',
      role: 'admin',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to Firestore `users/{uid}`
    await setDoc(doc(db, 'users', credential.user.uid), adminUser);
    localStorage.setItem('danix_auth_session', JSON.stringify(adminUser));
    return adminUser;
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    
    // If Firebase keys are not yet connected, provision securely in local store
    if (firebaseError?.code === 'auth/api-key-not-valid' || !isFirebaseConfigured) {
      const newUid = `admin-${Date.now()}`;
      const localAdmin: User = {
        uid: newUid,
        name,
        email: trimmedEmail,
        phone: phone || '',
        role: 'admin',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const existingUsersRaw = localStorage.getItem('danix_pos_users');
      let usersList: User[] = [];
      try {
        usersList = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
      } catch {
        usersList = [];
      }

      usersList.push(localAdmin);
      localStorage.setItem('danix_pos_users', JSON.stringify(usersList));
      localStorage.setItem('danix_auth_session', JSON.stringify(localAdmin));
      return localAdmin;
    }

    throw error;
  }
}

/**
 * Create a new user account (Staff or Admin) and save to Firestore
 */
export async function createUserAccount(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  phone?: string
): Promise<User> {
  const trimmedEmail = email.trim();

  try {
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    if (credential.user) {
      await updateProfile(credential.user, { displayName: name });
    }

    const newUser: User = {
      uid: credential.user.uid,
      name,
      email: credential.user.email || trimmedEmail,
      phone: phone || '',
      role,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, 'users', credential.user.uid), newUser);
    return newUser;
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };

    if (firebaseError?.code === 'auth/api-key-not-valid' || !isFirebaseConfigured) {
      const newUid = `user-${Date.now()}`;
      const localUser: User = {
        uid: newUid,
        name,
        email: trimmedEmail,
        phone: phone || '',
        role,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const existingUsersRaw = localStorage.getItem('danix_pos_users');
      let usersList: User[] = [];
      try {
        usersList = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
      } catch {
        usersList = [];
      }

      usersList.push(localUser);
      localStorage.setItem('danix_pos_users', JSON.stringify(usersList));
      return localUser;
    }

    throw error;
  }
}
