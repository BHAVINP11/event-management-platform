/**
 * Sidebar navigation configs, consumed by `AppShell`/`Sidebar`.
 *
 * These are plain presentation data (label + href + a "coming soon"
 * flag) — no role/permission logic lives here. `AppShell` decides which
 * config to show based on the URL (whether an `:eventId` is present), not
 * on a domain concept like "planner" or "couple"; nothing here or in the
 * shell hardcodes that distinction into the domain layer.
 *
 * Reconciling this list with what's actually built today (see
 * docs/ui-shell.md or the STEP UI-01 report for the full rationale):
 * - "Team" (the planner-facing label from the product brief) and
 *   "People" (the couple-facing label) are the same page today —
 *   `EventPeoplePage` — so both are represented by one "People" item.
 * - "Budget" is currently part of the Expenses page (it shows the
 *   event's budget summary and lets owner/planner edit it inline), so it
 *   is not yet a separate route. It is listed here as `comingSoon` to
 *   reflect the product brief's intent to eventually give it its own
 *   dedicated view, without producing a dead link today.
 */

export interface NavItem {
  label: string;
  to: string;
  /** Rendered disabled with a "Soon" badge instead of a working link. */
  comingSoon?: boolean;
  /** Exact-match only — needed for an item whose path is a prefix of a sibling's (e.g. Overview vs. Guests). */
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/** The signed-in, no-event-selected context (currently just the Dashboard). */
export function getTopLevelNavSections(): NavSection[] {
  return [
    {
      items: [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Profile', to: '/profile', comingSoon: true }
      ]
    }
  ];
}

/** The event workspace context, once an event is selected. */
export function getEventWorkspaceNavSections(eventId: string): NavSection[] {
  return [
    {
      title: 'Event',
      items: [
        { label: 'Overview', to: `/events/${eventId}`, end: true },
        { label: 'People', to: `/events/${eventId}/people` },
        { label: 'Guests', to: `/events/${eventId}/guests` },
        { label: 'Functions', to: `/events/${eventId}/functions` },
        { label: 'Budget', to: `/events/${eventId}/budget`, comingSoon: true },
        { label: 'Expenses', to: `/events/${eventId}/expenses` },
        { label: 'Vendors', to: `/events/${eventId}/vendors` },
        { label: 'Tasks', to: `/events/${eventId}/tasks` }
      ]
    }
  ];
}
