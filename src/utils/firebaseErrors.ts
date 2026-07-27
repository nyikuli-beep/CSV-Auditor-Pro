/**
 * Firebase Auth Error Mapper
 * Maps Firebase Auth error codes into clean, friendly user-facing messages.
 */

export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || (typeof error === 'string' ? error : '');

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in or use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Your password is too weak. Please ensure it satisfies all password requirements.';
    case 'auth/user-not-found':
      return 'No account was found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this domain.';
    case 'auth/network-request-failed':
      return 'Check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'This authentication method is currently disabled.';
    case 'auth/requires-recent-login':
      return 'Please log in again before attempting this security action.';
    default:
      if (error?.message && typeof error.message === 'string') {
        const cleaned = error.message
          .replace(/^Firebase:\s*Error\s*\([^)]+\):\s*/i, '')
          .replace(/^Firebase:\s*/i, '');
        if (cleaned && !cleaned.includes('auth/')) {
          return cleaned;
        }
      }
      return 'Authentication request failed. Please check your details and try again.';
  }
}
