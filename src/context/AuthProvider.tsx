import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  signInWithGoogle,
  logoutUser,
  sendPasswordReset,
  sendUserEmailVerification,
  reloadUserAndCheckVerification
} from '../firebase/auth';
import { syncUserProfileToFirestore } from '../utils/authHelpers';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerification: () => Promise<boolean>;
  checkEmailVerified: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let currentUid: string | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Whenever switching accounts, mark loading as true
      if (currentUser?.uid !== currentUid) {
        setLoading(true);
        currentUid = currentUser?.uid || null;
      }

      if (currentUser) {
        setUser(currentUser);
        try {
          await syncUserProfileToFirestore(currentUser);
        } catch (e) {
          console.warn("Could not sync user profile on auth change:", e);
        }
      } else {
        setUser(null);
        localStorage.removeItem('user_profile_uid');
        localStorage.removeItem('user_profile_avatar');
        localStorage.removeItem('user_profile_name');
        sessionStorage.removeItem('auth_session_active');
        sessionStorage.removeItem('auth_last_verified');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isEmailVerified = Boolean(
    user && (user.emailVerified || user.providerData[0]?.providerId === 'google.com')
  );

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const loggedInUser = await loginWithEmailPassword(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string): Promise<User> => {
    setLoading(true);
    try {
      const newUser = await registerWithEmailPassword(email, password, fullName);
      setUser(newUser);
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    setLoading(true);
    try {
      const gUser = await signInWithGoogle();
      setUser(gUser);
      return gUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    setUser(null);
    localStorage.removeItem('user_profile_uid');
    localStorage.removeItem('user_profile_avatar');
    localStorage.removeItem('user_profile_name');
    sessionStorage.removeItem('auth_session_active');
    sessionStorage.removeItem('auth_last_verified');
    try {
      await logoutUser();
    } catch (e) {
      console.error('Error during logout:', e);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await sendPasswordReset(email);
  };

  const resendVerification = async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in to resend verification.');
    }
    await sendUserEmailVerification(auth.currentUser);
  };

  const checkVerification = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const verified = await reloadUserAndCheckVerification(auth.currentUser);
    // Force React state refresh
    setUser(auth.currentUser ? { ...auth.currentUser } : null);
    return verified;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isEmailVerified,
        login,
        register,
        loginWithGoogle,
        logout,
        forgotPassword,
        resendVerification: resendVerification,
        resendVerificationEmail: resendVerification,
        checkVerification: checkVerification,
        checkEmailVerified: checkVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
