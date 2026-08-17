import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventAccess } from '@/features/events/hooks/useEventAccess';
import { getEventWorkspaceNavSections, getTopLevelNavSections } from '@/app/navigation';
import { eventRoleIdentityLabel } from '@/lib/labels';
import { EventHero } from '@/features/events/components/EventHero';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { EventNav } from '@/components/layout/EventNav';

/**
 * The authenticated application shell: header + global sidebar + main
 * content, used as a layout route wrapping `/dashboard` and every
 * `/events/:eventId` route.
 *
 * The global `Sidebar` always shows the same two items (Dashboard,
 * Profile) — it never switches to the event's own nav, so it stays
 * visually secondary; it can still be collapsed to an icon rail via its
 * own toggle, independent of anything event-related.
 *
 * Once an `:eventId` is present in the URL, the event hero and `EventNav`
 * render together as one sticky "Event Workspace header" — the hero
 * establishes identity ("this is MY event"), `EventNav` sits directly
 * beneath it as the primary way to move between Overview/Guests/... Both
 * persist across every event page (not just Overview), since the whole
 * point is that the user never loses track of which event they're in.
 * This has to live at this layout level (not inside each page) because
 * `EventNav` sits before `<Outlet />` in the DOM — a child route's
 * content can't render above a sibling that precedes the outlet.
 *
 * Auth gating (redirecting an unauthenticated visitor) is still handled
 * per-route by the existing `ProtectedRoute`, unchanged — this component
 * only reads `useAuth()`/`useEventAccess()` for display, never for access
 * control.
 */
export function AppShell(): JSX.Element {
  const { eventId } = useParams<{ eventId?: string }>();
  const { user } = useAuth();
  const { state: eventState, reload: reloadEvent } = useEventAccess(user?.id ?? null, eventId);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const contextLabel = eventId && eventState.status === 'allowed' ? eventState.event.name : undefined;
  const roleLabel =
    eventId && eventState.status === 'allowed'
      ? eventRoleIdentityLabel(eventState.event.role, eventState.event.side)
      : undefined;

  return (
    <div className={collapsed ? 'app-shell app-shell--collapsed' : 'app-shell'}>
      <div className="app-shell-header">
        <AppHeader contextLabel={contextLabel} roleLabel={roleLabel} onMenuClick={() => setMobileOpen(true)} />
      </div>

      <Sidebar
        sections={getTopLevelNavSections()}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="app-shell-main">
        {eventId && (
          <div className="event-workspace-header">
            <div className="event-workspace-card">
              {eventState.status === 'allowed' && (
                <EventHero event={eventState.event} onEventUpdated={reloadEvent} />
              )}
              <EventNav items={getEventWorkspaceNavSections(eventId)[0].items} />
            </div>
          </div>
        )}
        <div className="app-shell-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
