import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile,
  User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { syncUserProfileToFirestore } from '../utils/authHelpers';
import { getFriendlyErrorMessage } from '../utils/firebaseErrors';

export { getFriendlyErrorMessage };

/**
 * Email Registration with verification email trigger
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
      console.warn('Could not update Firebase user display name:', e);
    }
  }

  // Send Email Verification
  try {
    await firebaseSendEmailVerification(user);
  } catch (e) {
    console.warn('Could not send initial email verification:', e);
  }

  // Sync initial User Document to Firestore
  await syncUserProfileToFirestore(user, {
    displayName: trimmedName,
    provider: 'password',
  });

  return user;
}

/**
 * Email Login
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  const user = userCredential.user;

  // Sync lastLogin and emailVerified to Firestore
  await syncUserProfileToFirestore(user, {
    provider: 'password',
  });

  return user;
}

/**
 * Google Sign-In
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Sync to Firestore
  await syncUserProfileToFirestore(user, {
    provider: 'google.com',
  });

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
 * Resend Verification Email with error catching
 */
export async function sendUserEmailVerification(user: User): Promise<void> {
  if (!user) throw new Error('No active authenticated user found.');
  await firebaseSendEmailVerification(user);
}

/**
 * Reloads user instance and checks emailVerified status
 */
export async function reloadUserAndCheckVerification(user: User): Promise<boolean> {
  if (!user) return false;

  await user.reload();
  const updatedUser = auth.currentUser;

  if (updatedUser) {
    await syncUserProfileToFirestore(updatedUser);
    return updatedUser.emailVerified;
  }

  return false;
}

/**
 * Logout User
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
