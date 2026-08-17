import { Vendor } from '@/types/vendor';
import { vendorCategoryLabel, vendorStatusLabel } from '@/lib/labels';
import { vendorStatusBadgeVariant } from '@/lib/badgeVariants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

function VendorCard({
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
    <Card padded className="vendor-card">
      <div className="vendor-card-header">
        <h3>{vendor.name}</h3>
        <Badge variant={vendorStatusBadgeVariant(vendor.status)}>{vendorStatusLabel(vendor.status)}</Badge>
      </div>

      <Badge variant="neutral" className="vendor-category">
        {vendorCategoryLabel(vendor.category)}
      </Badge>

      {(vendor.phone || vendor.email) && (
        <div className="vendor-meta">
          {vendor.phone && <span>{vendor.phone}</span>}
          {vendor.email && <span>{vendor.email}</span>}
        </div>
      )}

      {vendor.notes && <p className="vendor-notes">{vendor.notes}</p>}

      {canManage && (
        <div className="vendor-card-actions">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * The vendor cards for `/events/:eventId/vendors`. `vendors` is the
 * already filtered/searched/sorted list; `hasAnyVendors` distinguishes
 * "no vendors on this event yet" from "no vendors match the current
 * filter/search," which need different empty-state copy.
 */
export function VendorList({
  vendors,
  hasAnyVendors,
  canManage,
  onAdd,
  onEdit,
  onDelete
}: {
  vendors: readonly Vendor[];
  hasAnyVendors: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
}): JSX.Element {
  if (vendors.length === 0) {
    return (
      <EmptyState
        title={hasAnyVendors ? 'No vendors match your search' : 'No vendors added yet'}
        description={
          hasAnyVendors
            ? 'Try a different name, category, or filter.'
            : 'Keep your event vendors organized in one place.'
        }
        action={canManage && !hasAnyVendors ? <Button onClick={onAdd}>+ Add Vendor</Button> : undefined}
      />
    );
  }

  return (
    <div className="vendors-grid">
      {vendors.map((vendor) => (
        <VendorCard
          key={vendor.id}
          vendor={vendor}
          canManage={canManage}
          onEdit={() => onEdit(vendor)}
          onDelete={() => onDelete(vendor)}
        />
      ))}
    </div>
  );
}
