import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
  AuthError
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

/**
 * Friendly Error Message Translator for Firebase Authentication
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const code = error.code || (typeof error === 'string' ? error : '');
  
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account was found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this domain.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access temporarily disabled. Please reset password or try again later.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled in your Firebase console settings.';
    case 'auth/unauthorized-domain':
      return 'Domain not authorized in Firebase Console. Add this domain to Authorized Domains in Firebase Auth settings.';
    case 'auth/requires-recent-login':
      return 'Please log in again before attempting this security-sensitive action.';
    default:
      if (error.message && typeof error.message === 'string') {
        // Strip out Firebase internal error code prefixes if present
        return error.message.replace(/^Firebase:\mn Error \([^)]+\): /, '').replace(/^Firebase: /, '');
      }
      return 'Authentication failed. Please try again.';
  }
}

/**
 * Email Registration
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  fullName: string
): Promise<User> {
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();

  // Create Firebase Auth Account
  const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  const user = userCredential.user;

  // Update Display Name
  if (trimmedName) {
    try {
      await updateProfile(user, { displayName: trimmedName });
    } catch (e) {
      console.warn("Could not update Firebase user display name:", e);
    }
  }

  // Send Email Verification safely
  try {
    await sendEmailVerification(user);
  } catch (e) {
    console.warn("Could not send email verification link:", e);
  }

  // Sync User Document to Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      name: trimmedName || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      role: 'Editor',
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore user sync failed on registration:", e);
  }

  return user;
}

/**
 * Email Login
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  return userCredential.user;
}

/**
 * Google Sign-In
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Sync to Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      avatar: user.photoURL || undefined,
      role: 'Editor',
      lastLogin: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore user sync failed on Google Login:", e);
  }

  return user;
}

/**
 * Password Reset Email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const trimmedEmail = email.trim();
  await sendPasswordResetEmail(auth, trimmedEmail);
}

/**
 * Logout User
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Send Verification Email manually
 */
export async function sendUserEmailVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}
