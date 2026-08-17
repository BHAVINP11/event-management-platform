import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGuestList } from '@/features/events/hooks/useGuestList';
import { GuestForm } from '@/features/events/components/GuestForm';
import { GuestList } from '@/features/events/components/GuestList';
import { guestService } from '@/app/services';
import { Guest, GuestSide, GuestStatus } from '@/types/guest';
import { GuestError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type SideFilter = 'all' | GuestSide.Bride | GuestSide.Groom;
type StatusFilter = 'all' | GuestStatus;
type FormMode = 'closed' | 'add' | Guest;

const SIDE_TABS: { id: SideFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: GuestSide.Bride, label: 'Bride' },
  { id: GuestSide.Groom, label: 'Groom' }
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: GuestStatus.Pending, label: 'Pending' },
  { value: GuestStatus.Invited, label: 'Invited' },
  { value: GuestStatus.Confirmed, label: 'Confirmed' },
  { value: GuestStatus.Declined, label: 'Declined' }
];

function GuestsNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <EmptyState
      title={title}
      description={body}
      action={
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

function matchesSideFilter(guest: Guest, filter: SideFilter): boolean {
  return filter === 'all' || guest.side === filter || guest.side === GuestSide.Both;
}

function matchesStatusFilter(guest: Guest, filter: StatusFilter): boolean {
  return filter === 'all' || guest.status === filter;
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
 * `canManage` (owner/planner/couple), enforced for real by the
 * createGuest/updateGuest/deleteGuest Cloud Functions regardless of what
 * this page shows. Side/status filters and search all run client-side
 * over the already-loaded (already-scoped) list — no new queries.
 */
export function GuestsPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useGuestList(user?.id ?? null, eventId);
  const { show: showToast } = useToast();

  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleGuests = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return state.data.guests.filter(
      (guest) =>
        matchesSideFilter(guest, sideFilter) && matchesStatusFilter(guest, statusFilter) && matchesSearch(guest, search)
    );
  }, [state, sideFilter, statusFilter, search]);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await guestService.deleteGuest(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Guest removed.', 'success');
      reload();
    } catch (err) {
      showToast(
        err instanceof GuestError ? err.friendlyMessage : "We couldn't remove this guest right now.",
        'danger'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="guests-page">
      {state.status === 'loading' && <LoadingState label="Loading guests…" />}

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
          <div className="guests-header">
            <div>
              <h1>Guests</h1>
              <p className="guests-subtitle">Keep track of everyone you&apos;re inviting.</p>
            </div>
            {state.data.canManage && <Button onClick={() => setFormMode('add')}>+ Add Guest</Button>}
          </div>

          {state.data.guests.length > 0 && (
            <p className="guests-count">
              {state.data.counts.total} guest{state.data.counts.total === 1 ? '' : 's'} · {state.data.counts.bride}{' '}
              bride side · {state.data.counts.groom} groom side
            </p>
          )}

          {state.data.guests.length > 0 && (
            <div className="guests-toolbar">
              <div className="guests-search">
                <Input
                  label="Search"
                  placeholder="Search by name or phone"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Tabs tabs={SIDE_TABS} activeId={sideFilter} onChange={(id) => setSideFilter(id as SideFilter)} />
              <div className="guests-status-filter">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  options={STATUS_FILTER_OPTIONS}
                />
              </div>
            </div>
          )}

          <GuestList
            guests={visibleGuests}
            hasAnyGuests={state.data.guests.length > 0}
            canManage={state.data.canManage}
            onAdd={() => setFormMode('add')}
            onEdit={(guest) => setFormMode(guest)}
            onDelete={(guest) => setDeleteTarget(guest)}
          />

          {formMode !== 'closed' && (
            <Modal
              open
              onClose={() => setFormMode('closed')}
              title={formMode === 'add' ? 'Add Guest' : 'Edit Guest'}
            >
              <GuestForm
                eventId={eventId}
                guest={formMode === 'add' ? undefined : formMode}
                allowedSides={state.data.manageableSides}
                onSaved={(message) => {
                  setFormMode('closed');
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setFormMode('closed')}
              />
            </Modal>
          )}

          {deleteTarget && (
            <Modal open onClose={() => setDeleteTarget(null)} title="Remove guest?">
              <p className="guest-confirm-body">
                Remove {deleteTarget.name} from the guest list? This can&apos;t be undone.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                  {deleting ? 'Removing…' : 'Remove Guest'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
