import { FormEvent, useState } from 'react';
import { vendorService } from '@/app/services';
import { VendorFormInput } from '@/features/events/types/vendors';
import { Vendor, VendorCategory, VendorStatus } from '@/types/vendor';
import { vendorCategoryLabel, vendorStatusLabel } from '@/lib/labels';
import { VendorError } from '@/lib/appError';

const CATEGORY_OPTIONS = Object.values(VendorCategory).map((category) => ({
  value: category,
  label: vendorCategoryLabel(category)
}));

const STATUS_OPTIONS = Object.values(VendorStatus).map((status) => ({
  value: status,
  label: vendorStatusLabel(status)
}));

interface VendorFormFields {
  name: string;
  category: VendorCategory;
  phone: string;
  email: string;
  notes: string;
  status: VendorStatus;
}

const toFields = (vendor: Vendor | undefined): VendorFormFields => ({
  name: vendor?.name ?? '',
  category: vendor?.category ?? VendorCategory.Other,
  phone: vendor?.phone ?? '',
  email: vendor?.email ?? '',
  notes: vendor?.notes ?? '',
  status: vendor?.status ?? VendorStatus.Enquiry
});

const toInput = (fields: VendorFormFields): VendorFormInput => ({
  name: fields.name,
  category: fields.category,
  status: fields.status,
  ...(fields.phone && { phone: fields.phone }),
  ...(fields.email && { email: fields.email }),
  ...(fields.notes && { notes: fields.notes })
});

/**
 * Add/edit vendor form. Only mounted for users with `canManage`
 * (owner/planner) — createVendor/updateVendor independently re-verify the
 * role server-side regardless. `eventId`/`createdBy`/`id`/`createdAt` are
 * never part of this form; the Cloud Function derives or preserves them
 * itself.
 */
export function VendorForm({
  eventId,
  vendor,
  onSaved,
  onCancel
}: {
  eventId: string;
  vendor?: Vendor;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<VendorFormFields>(toFields(vendor));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input = toInput(fields);
      if (vendor) {
        await vendorService.updateVendor(vendor.id, input);
      } else {
        await vendorService.createVendor(eventId, input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof VendorError ? err.friendlyMessage : "We couldn't save this vendor right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="vendor-name">Name *</label>
        <input
          id="vendor-name"
          name="name"
          type="text"
          value={fields.name}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="vendor-category">Category *</label>
          <select
            id="vendor-category"
            name="category"
            value={fields.category}
            onChange={handleChange}
            disabled={submitting}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="vendor-status">Status</label>
          <select id="vendor-status" name="status" value={fields.status} onChange={handleChange} disabled={submitting}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="vendor-phone">Phone</label>
          <input
            id="vendor-phone"
            name="phone"
            type="tel"
            value={fields.phone}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="vendor-email">Email</label>
          <input
            id="vendor-email"
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="vendor-notes">Notes</label>
        <textarea
          id="vendor-notes"
          name="notes"
          rows={3}
          value={fields.notes}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : vendor ? 'Save Changes' : 'Add Vendor'}
        </button>
      </div>
    </form>
  );
}
