import { User } from '@/types/user';

export interface AuthProfileError {
  kind: 'profileInvalid' | 'profileInfrastructure';
  message: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  profileError: AuthProfileError | null;
}

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}
