import { Vendor, VendorStatus } from '@/types/vendor';
import { vendorCategoryLabel, vendorStatusLabel } from '@/lib/labels';

const statusTagClass: Record<Vendor['status'], string> = {
  [VendorStatus.Enquiry]: 'status-draft',
  [VendorStatus.Shortlisted]: 'status-draft',
  [VendorStatus.Confirmed]: 'status-active',
  [VendorStatus.Cancelled]: 'status-archived'
};

function VendorRow({
  vendor,
  canManage,
  onEdit,
  onDelete
}: {
  vendor: Vendor;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{vendor.name}</h3>
        {vendor.phone && <p>{vendor.phone}</p>}
        {vendor.email && <p>{vendor.email}</p>}
        <div className="resource-meta">
          <span className="resource-tag">{vendorCategoryLabel(vendor.category)}</span>
          <span className={`resource-tag ${statusTagClass[vendor.status]}`}>{vendorStatusLabel(vendor.status)}</span>
        </div>
        {vendor.notes && <p>{vendor.notes}</p>}
      </div>

      {canManage && (
        <div className="resource-card-actions">
          <button type="button" className="btn-secondary" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-secondary" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The vendor rows for `/events/:eventId/vendors`. `vendors` is the already
 * filtered (by status tab) list; `hasAnyVendors` distinguishes "no vendors
 * on this event yet" from "no vendors match the current filter," which
 * need different empty-state copy.
 */
export function VendorList({
  vendors,
  hasAnyVendors,
  canManage,
  onEdit,
  onDelete
}: {
  vendors: readonly Vendor[];
  hasAnyVendors: boolean;
  canManage: boolean;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
}): JSX.Element {
  if (vendors.length === 0) {
    return (
      <div className="resource-empty">
        <p>{hasAnyVendors ? 'No vendors match this filter.' : 'No vendors added yet.'}</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {vendors.map((vendor) => (
        <VendorRow
          key={vendor.id}
          vendor={vendor}
          canManage={canManage}
          onEdit={() => onEdit(vendor)}
          onDelete={() => onDelete(vendor)}
        />
      ))}
    </ul>
  );
}
