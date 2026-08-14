import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGuestList } from '@/features/events/hooks/useGuestList';
import { GuestForm } from '@/features/events/components/GuestForm';
import { GuestList } from '@/features/events/components/GuestList';
import { guestService } from '@/app/services';
import { Guest, GuestSide } from '@/types/guest';
import { GuestError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

type SideFilter = 'all' | GuestSide.Bride | GuestSide.Groom;
type FormMode = 'closed' | 'add' | Guest;

const SIDE_FILTERS: { value: SideFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: GuestSide.Bride, label: 'Bride' },
  { value: GuestSide.Groom, label: 'Groom' }
];

function GuestsNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="resource-notice">
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/dashboard" className="btn-secondary">
        Back to dashboard
      </Link>
    </div>
  );
}

function matchesSideFilter(guest: Guest, filter: SideFilter): boolean {
  return filter === 'all' || guest.side === filter || guest.side === GuestSide.Both;
}

function matchesSearch(guest: Guest, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  const term = search.trim().toLowerCase();
  return guest.name.toLowerCase().includes(term) || Boolean(guest.phone?.toLowerCase().includes(term));
}

/**
 * `/events/:eventId/guests` — the event's guest list. Same access check as
 * the workspace Overview; Add/Edit/Delete are additionally gated by
 * `canManage` (owner/planner), enforced for real by the
 * createGuest/updateGuest/deleteGuest Cloud Functions regardless of what
 * this page shows. Side filter and search both run client-side over the
 * already-loaded list — simple, and avoids double-counting "both" guests
 * across separate queries.
 */
export function GuestsPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useGuestList(user?.id ?? null, eventId);
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleGuests = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return state.data.guests.filter(
      (guest) => matchesSideFilter(guest, sideFilter) && matchesSearch(guest, search)
    );
  }, [state, sideFilter, search]);

  const handleDelete = async (guest: Guest): Promise<void> => {
    if (!window.confirm(`Remove ${guest.name} from the guest list?`)) {
      return;
    }

    setActionError(null);
    try {
      await guestService.deleteGuest(guest.id);
      reload();
    } catch (err) {
      setActionError(err instanceof GuestError ? err.friendlyMessage : "We couldn't remove this guest right now.");
    }
  };

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={2} />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'denied' && (
        <GuestsNotice
          title="You don't have access to this event"
          body="Ask the event owner to invite you, then try again."
        />
      )}

      {state.status === 'notFound' && (
        <GuestsNotice
          title="We couldn't find this event"
          body="It may have been removed, or the link may be out of date."
        />
      )}

      {state.status === 'allowed' && eventId && (
        <>
          <div className="resource-section-header">
            <h1>Guests</h1>
            {state.data.canManage && formMode === 'closed' && (
              <button type="button" className="btn-primary" onClick={() => setFormMode('add')}>
                + Add Guest
              </button>
            )}
          </div>

          <div className="guest-counts">
            <div className="guest-count">
              <span className="guest-count-value">{state.data.counts.total}</span>
              <span className="guest-count-label">Total</span>
            </div>
            <div className="guest-count">
              <span className="guest-count-value">{state.data.counts.bride}</span>
              <span className="guest-count-label">Bride</span>
            </div>
            <div className="guest-count">
              <span className="guest-count-value">{state.data.counts.groom}</span>
              <span className="guest-count-label">Groom</span>
            </div>
          </div>

          {formMode !== 'closed' && (
            <GuestForm
              eventId={eventId}
              guest={formMode === 'add' ? undefined : formMode}
              onSaved={() => {
                setFormMode('closed');
                reload();
              }}
              onCancel={() => setFormMode('closed')}
            />
          )}

          <div className="guest-toolbar">
            <input
              type="search"
              className="guest-search-input"
              placeholder="Search by name or phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="guest-filter-tabs">
              {SIDE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`guest-filter-tab ${sideFilter === filter.value ? 'active' : ''}`}
                  onClick={() => setSideFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {actionError && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              {actionError}
            </div>
          )}

          <GuestList
            guests={visibleGuests}
            hasAnyGuests={state.data.guests.length > 0}
            canManage={state.data.canManage}
            onEdit={(guest) => setFormMode(guest)}
            onDelete={handleDelete}
          />
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
