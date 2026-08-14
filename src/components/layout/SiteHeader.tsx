import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function SiteHeader(): JSX.Element {
  const { isAuthenticated, user, signOut } = useAuth();

  const handleSignOut = async (): Promise<void> => {
    await signOut();
  };

  return (
    <header style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, margin: '0 auto', padding: '0 1rem' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Event Management Platform
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard">Dashboard</Link>
          {isAuthenticated ? (
            <>
              {(user?.displayName || user?.email) && <span>{user.displayName || user.email}</span>}
              <button type="button" onClick={() => void handleSignOut()}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
