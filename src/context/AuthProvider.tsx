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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync profile state safely
        syncUserProfileToFirestore(currentUser).catch(() => {});
      } else {
        localStorage.removeItem('user_profile_uid');
        localStorage.removeItem('user_profile_avatar');
        localStorage.removeItem('user_profile_name');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isEmailVerified = Boolean(
    user && (user.emailVerified || user.providerData[0]?.providerId === 'google.com')
  );

  const login = async (email: string, password: string): Promise<User> => {
    const loggedInUser = await loginWithEmailPassword(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (email: string, password: string, fullName: string): Promise<User> => {
    const newUser = await registerWithEmailPassword(email, password, fullName);
    setUser(newUser);
    return newUser;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const gUser = await signInWithGoogle();
    setUser(gUser);
    return gUser;
  };

  const logout = async (): Promise<void> => {
    await logoutUser();
    setUser(null);
    localStorage.removeItem('user_profile_uid');
    localStorage.removeItem('user_profile_avatar');
    localStorage.removeItem('user_profile_name');
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
