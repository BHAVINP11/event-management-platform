import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthState } from '@/features/auth/types/auth';
import { signOut as authSignOut, subscribeToAuthState } from '@/features/auth/services/authService';

const AuthContext = createContext<AuthState & { signOut: () => Promise<void> } | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<AuthState['user']>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileError, setProfileError] = useState<AuthState['profileError']>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((state) => {
      setUser(state.user);
      setIsAuthenticated(state.isAuthenticated);
      setProfileError(state.profileError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      profileError,
      signOut: async () => {
        await authSignOut();
      }
    }),
    [user, loading, isAuthenticated, profileError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState & { signOut: () => Promise<void> } => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
