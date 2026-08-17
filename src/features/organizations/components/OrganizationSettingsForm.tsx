import { FormEvent, useState } from 'react';
import { organizationSettingsService } from '@/app/services';
import { OrganizationDetailView } from '@/features/organizations/types/organizationAccess';
import { OrganizationError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface FormFields {
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
}

function toFields(organization: OrganizationDetailView): FormFields {
  return {
    name: organization.name,
    description: organization.description ?? '',
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone ?? ''
  };
}

/**
 * Organization Settings form. Only mounted for users with `canManage`
 * (owner/admin) — `updateOrganization` independently re-verifies the
 * role server-side regardless. `slug` is shown read-only elsewhere on
 * the page; it is not editable in this pass (see the final report for
 * why). Fields match the existing `Organization` model exactly — no new
 * fields are introduced.
 */
export function OrganizationSettingsForm({
  organization,
  onSaved
}: {
  organization: OrganizationDetailView;
  onSaved: (message: string) => void;
}): JSX.Element {
  const [fields, setFields] = useState<FormFields>(() => toFields(organization));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await organizationSettingsService.updateOrganization(organization.id, {
        name: fields.name,
        ...(fields.description && { description: fields.description }),
        ...(fields.contactEmail && { contactEmail: fields.contactEmail }),
        ...(fields.contactPhone && { contactPhone: fields.contactPhone })
      });
      onSaved('Organization details updated.');
    } catch (err) {
      setError(err instanceof OrganizationError ? err.friendlyMessage : "We couldn't save these changes right now.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <Input
        label="Organization name *"
        name="name"
        value={fields.name}
        onChange={handleChange}
        required
        disabled={submitting}
      />

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Slug"
          name="slug"
          value={organization.slug}
          disabled
          hint="The organization's slug cannot be changed."
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Contact email"
          name="contactEmail"
          type="email"
          value={fields.contactEmail}
          onChange={handleChange}
          disabled={submitting}
        />
        <Input
          label="Contact phone"
          name="contactPhone"
          type="tel"
          value={fields.contactPhone}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="organization-settings-description">
          Description
        </label>
        <textarea
          id="organization-settings-description"
          name="description"
          className="field-control"
          rows={3}
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-actions">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
