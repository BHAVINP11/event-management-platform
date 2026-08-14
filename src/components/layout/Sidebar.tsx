import { NavLink } from 'react-router-dom';
import { NavSection } from '@/app/navigation';

export interface SidebarProps {
  sections: readonly NavSection[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * The primary navigation for the authenticated app. Purely presentational
 * — it renders whatever `sections` it's given (see `src/app/navigation.ts`)
 * and knows nothing about roles, events, or Firebase. Desktop: a fixed
 * column, optionally collapsed to icons-only width. Mobile/tablet: an
 * off-canvas drawer toggled from `AppHeader`'s menu button.
 */
export function Sidebar({ sections, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps): JSX.Element {
  return (
    <div className={mobileOpen ? 'app-shell-sidebar app-shell-sidebar--mobile-open' : 'app-shell-sidebar'}>
      <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      <aside className="sidebar" aria-label="Primary navigation">
        {sections.map((section, index) => (
          <div className="sidebar-section" key={section.title ?? index}>
            {section.title && <div className="sidebar-section-title">{section.title}</div>}
            <ul className="sidebar-nav">
              {section.items.map((item) =>
                item.comingSoon ? (
                  <li key={item.to}>
                    <span className="sidebar-link sidebar-link--disabled" aria-disabled="true" title={item.label}>
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
                      <span className="sidebar-link-label">{item.label}</span>
                    </NavLink>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}

        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={onToggleCollapse}
          aria-pressed={collapsed}
        >
          <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    </div>
  );
}
