import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventAccess } from '@/features/events/hooks/useEventAccess';
import { getEventWorkspaceNavSections, getTopLevelNavSections } from '@/app/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';

/**
 * The authenticated application shell: header + sidebar + main content,
 * used as a layout route wrapping `/dashboard` and every `/events/:eventId`
 * route. Chooses between the top-level nav (Dashboard/Profile) and the
 * event workspace nav (Overview/Guests/...) based solely on whether the
 * current URL has an `:eventId` param — not on any planner/couple domain
 * concept, which stays out of this presentational layer entirely.
 *
 * Auth gating (redirecting an unauthenticated visitor) is still handled
 * per-route by the existing `ProtectedRoute`, unchanged — this component
 * only reads `useAuth()`/`useEventAccess()` for display, never for access
 * control.
 */
export function AppShell(): JSX.Element {
  const { eventId } = useParams<{ eventId?: string }>();
  const { user } = useAuth();
  const { state: eventState } = useEventAccess(user?.id ?? null, eventId);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = eventId ? getEventWorkspaceNavSections(eventId) : getTopLevelNavSections();
  const contextLabel = eventId && eventState.status === 'allowed' ? eventState.event.name : undefined;

  return (
    <div className={collapsed ? 'app-shell app-shell--collapsed' : 'app-shell'}>
      <div className="app-shell-header">
        <AppHeader contextLabel={contextLabel} onMenuClick={() => setMobileOpen(true)} />
      </div>

      <Sidebar
        sections={sections}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="app-shell-main">
        <Outlet />
      </main>
    </div>
  );
}
