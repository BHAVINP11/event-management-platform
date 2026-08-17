import { FormEvent, useState } from 'react';
import { guestService } from '@/app/services';
import { GuestFormInput } from '@/features/events/types/guests';
import { Guest, GuestSide, GuestStatus } from '@/types/guest';
import { GuestError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const ALL_SIDE_LABELS: Record<GuestSide, string> = {
  [GuestSide.Bride]: 'Bride',
  [GuestSide.Groom]: 'Groom',
  [GuestSide.Both]: 'Both'
};

const STATUS_OPTIONS: { value: GuestStatus; label: string }[] = [
  { value: GuestStatus.Pending, label: 'Pending' },
  { value: GuestStatus.Invited, label: 'Invited' },
  { value: GuestStatus.Confirmed, label: 'Confirmed' },
  { value: GuestStatus.Declined, label: 'Declined' }
];

interface GuestFormFields {
  name: string;
  phone: string;
  email: string;
  side: GuestSide;
  relation: string;
  notes: string;
  status: GuestStatus;
}

const toFields = (guest: Guest | undefined, allowedSides: readonly GuestSide[]): GuestFormFields => ({
  name: guest?.name ?? '',
  phone: guest?.phone ?? '',
  email: guest?.email ?? '',
  side: guest?.side ?? allowedSides[0] ?? GuestSide.Bride,
  relation: guest?.relation ?? '',
  notes: guest?.notes ?? '',
  status: guest?.status ?? GuestStatus.Pending
});

const toInput = (fields: GuestFormFields): GuestFormInput => ({
  name: fields.name,
  side: fields.side,
  status: fields.status,
  ...(fields.phone && { phone: fields.phone }),
  ...(fields.email && { email: fields.email }),
  ...(fields.relation && { relation: fields.relation }),
  ...(fields.notes && { notes: fields.notes })
});

/**
 * Add/edit guest form — the content of the Modal that hosts it. Only
 * mounted for users with `canManage` — and even then, the Side field only
 * offers the sides `allowedSides` says this caller may set (all three for
 * owner/planner, bride+both or groom+both for a couple member).
 * createGuest/updateGuest independently re-verify the chosen side
 * server-side regardless. `eventId`/`createdBy`/`id`/`createdAt` are never
 * part of this form; the Cloud Function derives or preserves them itself.
 */
export function GuestForm({
  eventId,
  guest,
  allowedSides,
  onSaved,
  onCancel
}: {
  eventId: string;
  guest?: Guest;
  allowedSides: readonly GuestSide[];
  onSaved: (message: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<GuestFormFields>(toFields(guest, allowedSides));
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
      if (guest) {
        await guestService.updateGuest(guest.id, input);
        onSaved('Guest updated.');
      } else {
        await guestService.createGuest(eventId, input);
        onSaved('Guest added.');
      }
    } catch (err) {
      setError(err instanceof GuestError ? err.friendlyMessage : "We couldn't save this guest right now.");
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

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Side *"
          name="side"
          value={fields.side}
          onChange={handleChange}
          disabled={submitting}
          options={allowedSides.map((side) => ({ value: side, label: ALL_SIDE_LABELS[side] }))}
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

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Relation"
          name="relation"
          placeholder="e.g., Uncle"
          value={fields.relation}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="guest-notes">
          Notes
        </label>
        <textarea
          id="guest-notes"
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
          {submitting ? 'Saving…' : guest ? 'Save Changes' : 'Add Guest'}
        </Button>
      </div>
    </form>
  );
}
