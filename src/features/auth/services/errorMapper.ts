import { AuthError } from 'firebase/auth';

export const mapFirebaseAuthError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  const authError = error as AuthError;

  switch (authError.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/wrong-password':
      return 'The password is incorrect. Please try again.';
    case 'auth/user-not-found':
      return 'No account was found with that email.';
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Authentication failed. Please try again.';
  }
};
