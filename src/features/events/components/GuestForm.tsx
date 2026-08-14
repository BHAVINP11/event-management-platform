import { FormEvent, useState } from 'react';
import { guestService } from '@/app/services';
import { GuestFormInput } from '@/features/events/types/guests';
import { Guest, GuestSide, GuestStatus } from '@/types/guest';
import { GuestError } from '@/lib/appError';

const SIDE_OPTIONS: { value: GuestSide; label: string }[] = [
  { value: GuestSide.Bride, label: 'Bride' },
  { value: GuestSide.Groom, label: 'Groom' },
  { value: GuestSide.Both, label: 'Both' }
];

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

const toFields = (guest?: Guest): GuestFormFields => ({
  name: guest?.name ?? '',
  phone: guest?.phone ?? '',
  email: guest?.email ?? '',
  side: guest?.side ?? GuestSide.Bride,
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
 * Add/edit guest form. Owner/planner only — the page never mounts this for
 * anyone else, and createGuest/updateGuest independently re-verify that
 * regardless. `eventId`/`createdBy`/`id`/`createdAt` are never part of this
 * form; the Cloud Function derives or preserves them itself.
 */
export function GuestForm({
  eventId,
  guest,
  onSaved,
  onCancel
}: {
  eventId: string;
  guest?: Guest;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<GuestFormFields>(toFields(guest));
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
      } else {
        await guestService.createGuest(eventId, input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof GuestError ? err.friendlyMessage : "We couldn't save this guest right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="guest-name">Name *</label>
        <input
          id="guest-name"
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
          <label htmlFor="guest-phone">Phone</label>
          <input
            id="guest-phone"
            name="phone"
            type="tel"
            value={fields.phone}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="guest-email">Email</label>
          <input
            id="guest-email"
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="guest-side">Side *</label>
          <select id="guest-side" name="side" value={fields.side} onChange={handleChange} disabled={submitting}>
            {SIDE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="guest-status">Status</label>
          <select id="guest-status" name="status" value={fields.status} onChange={handleChange} disabled={submitting}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="guest-relation">Relation</label>
        <input
          id="guest-relation"
          name="relation"
          type="text"
          placeholder="e.g., Uncle"
          value={fields.relation}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="guest-notes">Notes</label>
        <textarea
          id="guest-notes"
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
          {submitting ? 'Saving…' : guest ? 'Save Changes' : 'Add Guest'}
        </button>
      </div>
    </form>
  );
}
