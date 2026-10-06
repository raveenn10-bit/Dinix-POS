import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/config';
import {
  getCurrentUserProfile,
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  DEMO_USERS,
} from '@/lib/firebase/auth';
import { User, UserRole } from '@/types';

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check demo user in localStorage or setup listeners
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const loadDemoOrAnonymous = () => {
      const demoId = localStorage.getItem('danix_demo_user');
      if (demoId && DEMO_USERS[demoId]) {
        const demo = DEMO_USERS[demoId];
        setUserProfile(demo);
        setCurrentUser({
          uid: demo.uid,
          email: demo.email,
          displayName: demo.name,
        } as unknown as FirebaseUser);
      } else {
        setUserProfile(null);
        setCurrentUser(null);
      }
      setLoading(false);
    };

    if (isFirebaseConfigured) {
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          setCurrentUser(fbUser);
          try {
            const profile = await getCurrentUserProfile(fbUser.uid);
            if (profile) {
              setUserProfile(profile);
            } else {
              // Graceful fallback for authenticated user without Firestore document
              const fallback: User = {
                uid: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Danix Staff',
                email: fbUser.email || '',
                role: fbUser.email?.toLowerCase().includes('admin') ? 'admin' : 'staff',
                active: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setUserProfile(fallback);
            }
          } catch (err) {
            console.error('[AuthContext] Failed to load profile:', err);
          }
        } else {
          loadDemoOrAnonymous();
        }
        setLoading(false);
      });
    } else {
      loadDemoOrAnonymous();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await loginWithEmail(email, password);
      if ('user' in res && res.user) {
        const uid = res.user.uid;
        const profile = await getCurrentUserProfile(uid);
        if (profile) {
          setUserProfile(profile);
          setCurrentUser({
            uid: profile.uid,
            email: profile.email,
            displayName: profile.name,
          } as unknown as FirebaseUser);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  const role = userProfile?.role || null;
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';

  const value: AuthContextType = {
    currentUser,
    userProfile,
    role,
    loading,
    login,
    logout,
    resetPassword,
    isAdmin,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
