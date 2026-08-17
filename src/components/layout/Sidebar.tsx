import { NavLink } from 'react-router-dom';
import { NavSection } from '@/app/navigation';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/icons';

export interface SidebarProps {
  sections: readonly NavSection[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * The global navigation rail — always the same two items (Dashboard,
 * Profile) regardless of whether an event is selected, so it never
 * competes with the event workspace's own primary navigation (see
 * `EventNav`). Purely presentational — knows nothing about roles,
 * events, or Firebase. The signed-in user's identity lives in
 * `AppHeader` only, not duplicated here.
 *
 * Desktop: a fixed column that can collapse to an icon-only rail via the
 * toggle in its own header row (`.sidebar-top`) — a normal in-flow
 * element, not a floating control overlapping the boundary with the
 * main content. Mobile/tablet: an off-canvas drawer toggled from
 * `AppHeader`'s menu button; the collapse toggle only exists at desktop
 * widths (see `shell.css`).
 */
export function Sidebar({
  sections,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}: SidebarProps): JSX.Element {
  return (
    <div className={mobileOpen ? 'app-shell-sidebar app-shell-sidebar--mobile-open' : 'app-shell-sidebar'}>
      <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>

        <div className="sidebar-nav-scroll">
          {sections.map((section, index) => (
            <div className="sidebar-section" key={section.title ?? index}>
              {section.title && <div className="sidebar-section-title">{section.title}</div>}
              <ul className="sidebar-nav">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return item.comingSoon ? (
                    <li key={item.to}>
                      <span className="sidebar-link sidebar-link--disabled" aria-disabled="true" title={item.label}>
                        <Icon className="sidebar-link-icon" />
                        <span className="sidebar-link-label">{item.label}</span>
                        <span className="sidebar-link-soon">Soon</span>
                      </span>
                    </li>
                  ) : (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        title={item.label}
                        className={({ isActive }) =>
                          ['sidebar-link', isActive && 'sidebar-link--active'].filter(Boolean).join(' ')
                        }
                        onClick={onCloseMobile}
                      >
                        <Icon className="sidebar-link-icon" />
                        <span className="sidebar-link-label">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
