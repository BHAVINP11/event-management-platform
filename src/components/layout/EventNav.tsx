import { NavLink } from 'react-router-dom';
import { NavItem } from '@/app/navigation';

/**
 * The primary navigation once inside an event — Overview, People,
 * Guests, Functions, Budget, Expenses, Vendors, Tasks — rendered as a
 * horizontal strip at the top of the workspace content so it reads as
 * "these are this event's areas," not a second sidebar. The global
 * `Sidebar` stays deliberately minimal (Dashboard/Profile only) so the
 * two navigation systems never compete for attention.
 */
export function EventNav({ items }: { items: readonly NavItem[] }): JSX.Element {
  return (
    <nav className="event-nav" aria-label="Event workspace">
      <ul className="event-nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          return item.comingSoon ? (
            <li key={item.to}>
              <span className="event-nav-link event-nav-link--disabled" aria-disabled="true" title={item.label}>
                <Icon className="event-nav-link-icon" />
                {item.label}
                <span className="event-nav-link-soon">Soon</span>
              </span>
            </li>
          ) : (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  ['event-nav-link', isActive && 'event-nav-link--active'].filter(Boolean).join(' ')
                }
              >
                <Icon className="event-nav-link-icon" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
