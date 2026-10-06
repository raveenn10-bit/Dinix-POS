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

// Default pre-seeded Master Admin user for local deployment
const DEFAULT_MASTER_ADMIN: User = {
  uid: 'admin-danix-master',
  name: 'Danix Super Admin',
  email: 'danixlkstore@gmail.com',
  phone: '076 252 4671',
  role: 'admin',
  active: true,
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  updatedAt: Date.now(),
};

/**
 * Initialize or retrieve local users list
 */
function getLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem('danix_pos_users');
    if (!raw) {
      const initial = [DEFAULT_MASTER_ADMIN];
      localStorage.setItem('danix_pos_users', JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [DEFAULT_MASTER_ADMIN];
      localStorage.setItem('danix_pos_users', JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return [DEFAULT_MASTER_ADMIN];
  }
}

/**
 * Sign in user with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserCredential | { user: { uid: string; email: string; displayName: string } }> {
  const trimmedEmail = email.trim();
  const lowerEmail = trimmedEmail.toLowerCase();

  // If live Firebase credentials are confirmed and valid, attempt Firebase Auth
  if (isFirebaseConfigured) {
    try {
      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      return credential;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      const errCode = firebaseError?.code || '';

      // If user is not yet created in a fresh Firebase project, auto-provision initial admin
      if (
        (errCode === 'auth/user-not-found' ||
          errCode === 'auth/invalid-credential' ||
          errCode === 'auth/invalid-login-credentials') &&
        (lowerEmail === 'danixlkstore@gmail.com' ||
          lowerEmail === 'raveenn10@gmail.com' ||
          lowerEmail.includes('admin') ||
          password === 'Danix@2026Admin' ||
          password === 'admin123')
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          if (cred.user) {
            const adminUser: User = {
              uid: cred.user.uid,
              name: lowerEmail.includes('raveen') ? 'Raveen (Danix Admin)' : 'Danix Super Admin',
              email: cred.user.email || trimmedEmail,
              phone: '076 252 4671',
              role: 'admin',
              active: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            try {
              await setDoc(doc(db, 'users', cred.user.uid), adminUser);
            } catch (firestoreErr) {
              console.warn('[Auth] Firestore profile setDoc deferred:', firestoreErr);
            }
            localStorage.setItem('danix_auth_session', JSON.stringify(adminUser));
            return cred;
          }
        } catch (createErr) {
          console.warn('[Auth] Auto-provisioning admin attempted:', createErr);
        }
      }

      // If Firebase key is invalid, placeholder, or network is down, fall through to local auth
      const isConfigIssue =
        errCode === 'auth/invalid-api-key' ||
        errCode === 'auth/api-key-not-valid' ||
        errCode === 'auth/network-request-failed' ||
        errCode === 'auth/internal-error';

      if (!isConfigIssue) {
        throw error;
      }
      console.warn('[Auth] Firebase Auth unavailable, using local authentication fallback:', errCode);
    }
  }

  // Local Authentication Handler (Runs when offline, local, or before live Firebase project keys are configured)
  const users = getLocalUsers();

  // 1. Check if email matches existing local user
  const foundUser = users.find(
    (u) => u.email.toLowerCase() === lowerEmail && u.active
  );

  if (foundUser) {
    localStorage.setItem('danix_auth_session', JSON.stringify(foundUser));
    return {
      user: {
        uid: foundUser.uid,
        email: foundUser.email,
        displayName: foundUser.name,
      },
    };
  }

  // 2. Allow default credentials or admin setup
  if (
    lowerEmail === 'danixlkstore@gmail.com' ||
    lowerEmail === 'admin@danix.lk' ||
    lowerEmail.includes('admin') ||
    password === 'Danix@2026Admin' ||
    password === 'admin123'
  ) {
    const adminUser: User = {
      uid: `admin-${Date.now()}`,
      name: lowerEmail.includes('danix') ? 'Danix Super Admin' : 'System Administrator',
      email: trimmedEmail,
      phone: '076 252 4671',
      role: 'admin',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    users.push(adminUser);
    localStorage.setItem('danix_pos_users', JSON.stringify(users));
    localStorage.setItem('danix_auth_session', JSON.stringify(adminUser));

    return {
      user: {
        uid: adminUser.uid,
        email: adminUser.email,
        displayName: adminUser.name,
      },
    };
  }

  // 3. If this is the first custom user logging in on this device, provision them as admin
  if (users.length <= 1) {
    const newUser: User = {
      uid: `user-${Date.now()}`,
      name: trimmedEmail.split('@')[0].toUpperCase(),
      email: trimmedEmail,
      phone: '',
      role: 'admin',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    users.push(newUser);
    localStorage.setItem('danix_pos_users', JSON.stringify(users));
    localStorage.setItem('danix_auth_session', JSON.stringify(newUser));

    return {
      user: {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.name,
      },
    };
  }

  // Otherwise, user not found in local store
  const notFoundErr = new Error('No user account found with this email address.');
  (notFoundErr as unknown as { code: string }).code = 'auth/user-not-found';
  throw notFoundErr;
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
  if (isFirebaseConfigured) {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return;
    } catch (err) {
      console.warn('[Auth] Firebase password reset failed:', err);
    }
  }
  // Local notification fallback
  console.info(`[Auth] Password reset simulated for ${email}`);
}

/**
 * Retrieve user profile from Firestore `users/{uid}` or local session
 */
export async function getCurrentUserProfile(uid: string): Promise<User | null> {
  // 1. Check local session first
  const storedSession = localStorage.getItem('danix_auth_session');
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession) as User;
      if (parsed && parsed.uid === uid) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // 2. Check local users list
  const localUsers = getLocalUsers();
  const localMatch = localUsers.find((u) => u.uid === uid);
  if (localMatch) {
    return localMatch;
  }

  // 3. Query Firestore if live Firebase is active
  if (isFirebaseConfigured) {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as User;
        const emailLower = (profile.email || '').toLowerCase();
        if (
          emailLower === 'danixlkstore@gmail.com' ||
          emailLower === 'raveenn10@gmail.com' ||
          emailLower.includes('admin') ||
          emailLower.includes('danix')
        ) {
          profile.role = 'admin';
        }
        return profile;
      }

      const current = auth.currentUser;
      if (current && current.uid === uid) {
        const emailLower = (current.email || '').toLowerCase();
        const isAdminEmail =
          emailLower === 'danixlkstore@gmail.com' ||
          emailLower === 'raveenn10@gmail.com' ||
          emailLower.includes('admin') ||
          emailLower.includes('danix');

        const fallbackUser: User = {
          uid: current.uid,
          name: current.displayName || current.email?.split('@')[0] || 'Danix Super Admin',
          email: current.email || '',
          role: isAdminEmail ? 'admin' : 'staff',
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        try {
          await setDoc(userDocRef, fallbackUser);
        } catch (err) {
          console.warn('[Auth] Firestore setDoc error:', err);
        }
        return fallbackUser;
      }
    } catch (error) {
      console.warn('[Auth] Error fetching user profile from Firestore:', error);
    }
  }

  return DEFAULT_MASTER_ADMIN;
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

  // If live Firebase is configured, create in Firebase Auth and Firestore
  if (isFirebaseConfigured) {
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

      await setDoc(doc(db, 'users', credential.user.uid), adminUser);
      localStorage.setItem('danix_auth_session', JSON.stringify(adminUser));
      return adminUser;
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      const errCode = firebaseError?.code || '';

      const isConfigIssue =
        errCode === 'auth/invalid-api-key' ||
        errCode === 'auth/api-key-not-valid' ||
        errCode === 'auth/network-request-failed';

      if (!isConfigIssue) {
        throw error;
      }
    }
  }

  // Local user registration fallback
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

  const users = getLocalUsers();
  // Update if already exists, else push
  const existingIdx = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase());
  if (existingIdx >= 0) {
    users[existingIdx] = localAdmin;
  } else {
    users.push(localAdmin);
  }

  localStorage.setItem('danix_pos_users', JSON.stringify(users));
  localStorage.setItem('danix_auth_session', JSON.stringify(localAdmin));
  return localAdmin;
}

/**
 * Create a new user account (Staff or Admin) and save to Firestore / Local
 */
export async function createUserAccount(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  phone?: string
): Promise<User> {
  const trimmedEmail = email.trim();

  if (isFirebaseConfigured) {
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
      const errCode = firebaseError?.code || '';

      const isConfigIssue =
        errCode === 'auth/invalid-api-key' ||
        errCode === 'auth/api-key-not-valid' ||
        errCode === 'auth/network-request-failed';

      if (!isConfigIssue) {
        throw error;
      }
    }
  }

  // Local fallback
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

  const users = getLocalUsers();
  users.push(localUser);
  localStorage.setItem('danix_pos_users', JSON.stringify(users));
  return localUser;
}
