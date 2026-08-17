import { FormEvent, useState } from 'react';
import { vendorService } from '@/app/services';
import { VendorFormInput } from '@/features/events/types/vendors';
import { Vendor, VendorCategory, VendorStatus } from '@/types/vendor';
import { vendorCategoryLabel, vendorStatusLabel } from '@/lib/labels';
import { VendorError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

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
 * Add/edit vendor form — the content of the Modal that hosts it. Only
 * mounted for users with `canManage` (owner/planner) — createVendor/
 * updateVendor independently re-verify the role server-side regardless.
 * `eventId`/`createdBy`/`id`/`createdAt` are never part of this form; the
 * Cloud Function derives or preserves them itself.
 */
export function VendorForm({
  eventId,
  vendor,
  onSaved,
  onCancel
}: {
  eventId: string;
  vendor?: Vendor;
  onSaved: (message: string) => void;
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
        onSaved('Vendor updated.');
      } else {
        await vendorService.createVendor(eventId, input);
        onSaved('Vendor added.');
      }
    } catch (err) {
      setError(err instanceof VendorError ? err.friendlyMessage : "We couldn't save this vendor right now.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <Input label="Name *" name="name" value={fields.name} onChange={handleChange} required disabled={submitting} />

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Category *"
          name="category"
          value={fields.category}
          onChange={handleChange}
          disabled={submitting}
          options={CATEGORY_OPTIONS}
        />
        <Select
          label="Status"
          name="status"
          value={fields.status}
          onChange={handleChange}
          disabled={submitting}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={fields.phone}
          onChange={handleChange}
          disabled={submitting}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={fields.email}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="vendor-notes">
          Notes
        </label>
        <textarea
          id="vendor-notes"
          name="notes"
          className="field-control"
          rows={3}
          value={fields.notes}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : vendor ? 'Save Changes' : 'Add Vendor'}
        </Button>
      </div>
    </form>
  );
}
