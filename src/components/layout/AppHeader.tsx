import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';

export interface AppHeaderProps {
  /** The current event's name, shown next to the brand when inside an event workspace. */
  contextLabel?: string;
  onMenuClick: () => void;
}

/**
 * The authenticated app's top bar: brand, current context, and the
 * signed-in user's avatar/name with a Sign Out action. Reads `useAuth()`
 * directly rather than duplicating auth/session logic.
 */
export function AppHeader({ contextLabel, onMenuClick }: AppHeaderProps): JSX.Element {
  const { user, signOut } = useAuth();
  const displayName = user?.displayName || user?.email || 'Account';

  const handleSignOut = async (): Promise<void> => {
    await signOut();
  };

  return (
    <header className="app-header">
      <div className="app-header-start">
        <button type="button" className="app-header-menu-button" aria-label="Open navigation" onClick={onMenuClick}>
          ☰
        </button>
        <Link to="/dashboard" className="app-header-brand">
          Event Management Platform
        </Link>
        {contextLabel && <span className="app-header-context">{contextLabel}</span>}
      </div>

      <div className="app-header-end">
        <Dropdown
          label={displayName}
          trigger={
            <>
              <Avatar name={displayName} size="sm" />
              <span className="app-header-user-name">{displayName}</span>
            </>
          }
          items={[{ label: 'Sign Out', onSelect: () => void handleSignOut() }]}
        />
      </div>
    </header>
  );
}
