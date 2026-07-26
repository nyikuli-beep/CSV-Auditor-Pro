import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  signInWithGoogle,
  logoutUser,
  sendPasswordReset
} from '../firebase/auth';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await sendPasswordReset(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        forgotPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
