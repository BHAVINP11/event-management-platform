import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import { IconMenu } from '@/components/ui/icons';

export interface AppHeaderProps {
  /** The current event's name, shown next to the brand when inside an event workspace. */
  contextLabel?: string;
  /** Human-readable relationship to the current event (e.g. "Owner"), omitted when unavailable. */
  roleLabel?: string;
  onMenuClick: () => void;
}

/**
 * The authenticated app's top bar: brand/context breadcrumb, and the
 * signed-in user's avatar/name/role with a Sign Out action. Reads
 * `useAuth()` directly rather than duplicating auth/session logic; role
 * is handed in by `AppShell`, which already resolves it from the
 * existing `useEventAccess` read — nothing here invents or re-derives it.
 */
export function AppHeader({ contextLabel, roleLabel, onMenuClick }: AppHeaderProps): JSX.Element {
  const { user, signOut } = useAuth();
  const displayName = user?.displayName || user?.email || 'Account';

  const handleSignOut = async (): Promise<void> => {
    await signOut();
  };

  return (
    <header className="app-header">
      <div className="app-header-start">
        <button type="button" className="app-header-menu-button" aria-label="Open navigation" onClick={onMenuClick}>
          <IconMenu />
        </button>
        <Link to="/dashboard" className="app-header-brand">
          Event Management
        </Link>
        {contextLabel && (
          <span className="app-header-context" title={contextLabel}>
            {contextLabel}
          </span>
        )}
      </div>

      <div className="app-header-end">
        <Dropdown
          label={displayName}
          trigger={
            <span className="app-header-user">
              <Avatar name={displayName} size="sm" />
              <span className="app-header-user-text">
                <span className="app-header-user-name" title={displayName}>
                  {displayName}
                </span>
                {roleLabel && <span className="app-header-user-role">{roleLabel}</span>}
              </span>
            </span>
          }
          items={[
            { label: 'Profile', onSelect: () => undefined, disabled: true },
            { label: 'Settings', onSelect: () => undefined, disabled: true },
            { label: 'Sign Out', onSelect: () => void handleSignOut() }
          ]}
        />
      </div>
    </header>
  );
}
