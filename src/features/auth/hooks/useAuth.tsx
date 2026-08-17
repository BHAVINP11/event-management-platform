import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthState } from '@/features/auth/types/auth';
import { signOut as authSignOut, subscribeToAuthState } from '@/features/auth/services/authService';
import { getUserProfile } from '@/features/auth/services/userProfileService';

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  /** Re-reads the signed-in user's own profile document — used after a Profile edit so the header/sidebar reflect it immediately, not just on next login. */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
      },
      refreshProfile: async () => {
        if (!user) {
          return;
        }
        try {
          const refreshed = await getUserProfile(user.id);
          if (refreshed) {
            setUser(refreshed);
          }
        } catch {
          // Best-effort only — the page that triggered this already has its own up-to-date copy.
        }
      }
    }),
    [user, loading, isAuthenticated, profileError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
