/**
 * Converts Firebase Auth error codes into friendly user messages.
 */
export function getFriendlyAuthErrorMessage(errorCode: string | undefined): string {
  if (!errorCode) return 'An unexpected error occurred. Please try again.';

  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Your password is too weak. Please meet all password requirements.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Access temporarily restricted. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before attempting this security operation.';
    case 'auth/email-not-verified':
      return 'Please verify your email address before accessing CSV Auditor Pro.';
    case 'auth/popup-closed-by-user':
      return 'The sign-in popup was closed before completing authorization.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/cancelled-popup-request':
      return 'Authentication request cancelled.';
    case 'auth/quota-exceeded':
      return 'Quota limit exceeded. Please try again later.';
    default:
      if (errorCode.includes('email-already-in-use')) {
        return 'This email is already registered. Try logging in instead.';
      }
      return 'Authentication failed. Please check your details and try again.';
  }
}
