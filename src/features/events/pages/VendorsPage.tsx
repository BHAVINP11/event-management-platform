import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useVendorList } from '@/features/events/hooks/useVendorList';
import { VendorForm } from '@/features/events/components/VendorForm';
import { VendorList } from '@/features/events/components/VendorList';
import { sortVendorsByName } from '@/features/events/services/vendorSorting';
import { vendorService } from '@/app/services';
import { Vendor, VendorCategory, VendorStatus } from '@/types/vendor';
import { vendorCategoryLabel, vendorStatusLabel } from '@/lib/labels';
import { VendorError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type CategoryFilter = 'all' | VendorCategory;
type StatusFilter = 'all' | VendorStatus;
type FormMode = 'closed' | 'add' | Vendor;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: VendorStatus.Enquiry, label: vendorStatusLabel(VendorStatus.Enquiry) },
  { id: VendorStatus.Shortlisted, label: vendorStatusLabel(VendorStatus.Shortlisted) },
  { id: VendorStatus.Confirmed, label: vendorStatusLabel(VendorStatus.Confirmed) },
  { id: VendorStatus.Cancelled, label: vendorStatusLabel(VendorStatus.Cancelled) }
];

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  ...Object.values(VendorCategory).map((category) => ({ value: category, label: vendorCategoryLabel(category) }))
];

function VendorsNotice({ title, body }: { title: string; body: string }): JSX.Element {
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

function matchesCategoryFilter(vendor: Vendor, filter: CategoryFilter): boolean {
  return filter === 'all' || vendor.category === filter;
}

function matchesStatusFilter(vendor: Vendor, filter: StatusFilter): boolean {
  return filter === 'all' || vendor.status === filter;
}

function matchesSearch(vendor: Vendor, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  const term = search.trim().toLowerCase();
  return (
    vendor.name.toLowerCase().includes(term) ||
    Boolean(vendor.phone?.toLowerCase().includes(term)) ||
    Boolean(vendor.email?.toLowerCase().includes(term))
  );
}

/**
 * `/events/:eventId/vendors` — the event's vendor list. Same access check
 * as the workspace Overview; Add/Edit/Delete are additionally gated by
 * `canManage` (owner/planner), enforced for real by the createVendor/
 * updateVendor/deleteVendor Cloud Functions regardless of what this page
 * shows. Search/category/status filters and sorting all run client-side
 * over the already-loaded (already-scoped) list — no new queries.
 */
export function VendorsPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useVendorList(user?.id ?? null, eventId);
  const { show: showToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleVendors = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return sortVendorsByName(state.data.vendors).filter(
      (vendor) =>
        matchesCategoryFilter(vendor, categoryFilter) &&
        matchesStatusFilter(vendor, statusFilter) &&
        matchesSearch(vendor, search)
    );
  }, [state, categoryFilter, statusFilter, search]);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await vendorService.deleteVendor(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Vendor removed.', 'success');
      reload();
    } catch (err) {
      showToast(
        err instanceof VendorError ? err.friendlyMessage : "We couldn't remove this vendor right now.",
        'danger'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="vendors-page">
      {state.status === 'loading' && <LoadingState label="Loading vendors…" />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'denied' && (
        <VendorsNotice
          title="You don't have access to this event"
          body="Ask the event owner to invite you, then try again."
        />
      )}

      {state.status === 'notFound' && (
        <VendorsNotice
          title="We couldn't find this event"
          body="It may have been removed, or the link may be out of date."
        />
      )}

      {state.status === 'allowed' && eventId && (
        <>
          <div className="vendors-header">
            <div>
              <h1>Vendors</h1>
              <p className="vendors-subtitle">Keep every service provider for this event in one place.</p>
            </div>
            {state.data.canManage && <Button onClick={() => setFormMode('add')}>+ Add Vendor</Button>}
          </div>

          {state.data.vendors.length > 0 && (
            <p className="vendors-count">
              {state.data.vendors.length} vendor{state.data.vendors.length === 1 ? '' : 's'}
            </p>
          )}

          {state.data.vendors.length > 0 && (
            <div className="vendors-toolbar">
              <div className="vendors-search">
                <Input
                  label="Search"
                  placeholder="Search by name, phone, or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Tabs tabs={STATUS_TABS} activeId={statusFilter} onChange={(id) => setStatusFilter(id as StatusFilter)} />
              <div className="vendors-category-filter">
                <Select
                  label="Category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                  options={CATEGORY_FILTER_OPTIONS}
                />
              </div>
            </div>
          )}

          <VendorList
            vendors={visibleVendors}
            hasAnyVendors={state.data.vendors.length > 0}
            canManage={state.data.canManage}
            onAdd={() => setFormMode('add')}
            onEdit={(vendor) => setFormMode(vendor)}
            onDelete={(vendor) => setDeleteTarget(vendor)}
          />

          {formMode !== 'closed' && (
            <Modal
              open
              onClose={() => setFormMode('closed')}
              title={formMode === 'add' ? 'Add Vendor' : 'Edit Vendor'}
            >
              <VendorForm
                eventId={eventId}
                vendor={formMode === 'add' ? undefined : formMode}
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
            <Modal open onClose={() => setDeleteTarget(null)} title="Remove vendor?">
              <p className="vendor-confirm-body">
                Remove &ldquo;{deleteTarget.name}&rdquo; from this event&apos;s vendors? This can&apos;t be undone.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                  {deleting ? 'Removing…' : 'Remove Vendor'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
