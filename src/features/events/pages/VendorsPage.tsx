import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useVendorList } from '@/features/events/hooks/useVendorList';
import { VendorForm } from '@/features/events/components/VendorForm';
import { VendorList } from '@/features/events/components/VendorList';
import { vendorService } from '@/app/services';
import { Vendor, VendorStatus } from '@/types/vendor';
import { vendorStatusLabel } from '@/lib/labels';
import { VendorError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

type StatusFilter = 'all' | VendorStatus;
type FormMode = 'closed' | 'add' | Vendor;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: VendorStatus.Enquiry, label: vendorStatusLabel(VendorStatus.Enquiry) },
  { value: VendorStatus.Shortlisted, label: vendorStatusLabel(VendorStatus.Shortlisted) },
  { value: VendorStatus.Confirmed, label: vendorStatusLabel(VendorStatus.Confirmed) },
  { value: VendorStatus.Cancelled, label: vendorStatusLabel(VendorStatus.Cancelled) }
];

function VendorsNotice({ title, body }: { title: string; body: string }): JSX.Element {
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

/**
 * `/events/:eventId/vendors` — the event's vendor list. Same access check
 * as the workspace Overview; Add/Edit/Delete are additionally gated by
 * `canManage` (owner/planner), enforced for real by the createVendor/
 * updateVendor/deleteVendor Cloud Functions regardless of what this page
 * shows. The status filter runs client-side over the already-loaded list.
 */
export function VendorsPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useVendorList(user?.id ?? null, eventId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleVendors = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return state.data.vendors.filter((vendor) => statusFilter === 'all' || vendor.status === statusFilter);
  }, [state, statusFilter]);

  const handleDelete = async (vendor: Vendor): Promise<void> => {
    if (!window.confirm(`Remove "${vendor.name}" from this event's vendors?`)) {
      return;
    }

    setActionError(null);
    try {
      await vendorService.deleteVendor(vendor.id);
      reload();
    } catch (err) {
      setActionError(err instanceof VendorError ? err.friendlyMessage : "We couldn't remove this vendor right now.");
    }
  };

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={2} />}

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
          <div className="resource-section-header">
            <h1>Vendors</h1>
            {state.data.canManage && formMode === 'closed' && (
              <button type="button" className="btn-primary" onClick={() => setFormMode('add')}>
                + Add Vendor
              </button>
            )}
          </div>

          {formMode !== 'closed' && (
            <VendorForm
              eventId={eventId}
              vendor={formMode === 'add' ? undefined : formMode}
              onSaved={() => {
                setFormMode('closed');
                reload();
              }}
              onCancel={() => setFormMode('closed')}
            />
          )}

          <div className="guest-filter-tabs" style={{ marginBottom: '1.5rem' }}>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`guest-filter-tab ${statusFilter === filter.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {actionError && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              {actionError}
            </div>
          )}

          <VendorList
            vendors={visibleVendors}
            hasAnyVendors={state.data.vendors.length > 0}
            canManage={state.data.canManage}
            onEdit={(vendor) => setFormMode(vendor)}
            onDelete={handleDelete}
          />
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
