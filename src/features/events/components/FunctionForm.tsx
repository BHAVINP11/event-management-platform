import { FormEvent, useState } from 'react';
import { functionService } from '@/app/services';
import { FunctionFormInput } from '@/features/events/types/functions';
import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';
import { FunctionError } from '@/lib/appError';

const STATUS_OPTIONS: { value: EventFunctionStatus; label: string }[] = [
  { value: EventFunctionStatus.Planned, label: 'Planned' },
  { value: EventFunctionStatus.Confirmed, label: 'Confirmed' },
  { value: EventFunctionStatus.Completed, label: 'Completed' },
  { value: EventFunctionStatus.Cancelled, label: 'Cancelled' }
];

interface FunctionFormFields {
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  notes: string;
  status: EventFunctionStatus;
}

const toFields = (fn: EventFunction | undefined): FunctionFormFields => ({
  name: fn?.name ?? '',
  description: fn?.description ?? '',
  date: fn?.date ?? '',
  startTime: fn?.startTime ?? '',
  endTime: fn?.endTime ?? '',
  venue: fn?.venue ?? '',
  notes: fn?.notes ?? '',
  status: fn?.status ?? EventFunctionStatus.Planned
});

const toInput = (fields: FunctionFormFields): FunctionFormInput => ({
  name: fields.name,
  status: fields.status,
  ...(fields.description && { description: fields.description }),
  ...(fields.date && { date: fields.date }),
  ...(fields.startTime && { startTime: fields.startTime }),
  ...(fields.endTime && { endTime: fields.endTime }),
  ...(fields.venue && { venue: fields.venue }),
  ...(fields.notes && { notes: fields.notes })
});

/**
 * Add/edit function/ceremony form. Only mounted for users with
 * `canManage` (owner/planner) — createFunction/updateFunction
 * independently re-verify the role server-side regardless. `eventId`/
 * `createdBy`/`id`/`createdAt` are never part of this form; the Cloud
 * Function derives or preserves them itself.
 */
export function FunctionForm({
  eventId,
  fn,
  onSaved,
  onCancel
}: {
  eventId: string;
  fn?: EventFunction;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<FunctionFormFields>(toFields(fn));
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
      if (fn) {
        await functionService.updateFunction(fn.id, input);
      } else {
        await functionService.createFunction(eventId, input);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof FunctionError ? err.friendlyMessage : "We couldn't save this function right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="function-name">Name *</label>
        <input
          id="function-name"
          name="name"
          type="text"
          value={fields.name}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="function-description">Description</label>
        <textarea
          id="function-description"
          name="description"
          rows={2}
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="function-date">Date</label>
          <input
            id="function-date"
            name="date"
            type="date"
            value={fields.date}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="function-status">Status</label>
          <select id="function-status" name="status" value={fields.status} onChange={handleChange} disabled={submitting}>
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
          <label htmlFor="function-start-time">Start Time</label>
          <input
            id="function-start-time"
            name="startTime"
            type="time"
            value={fields.startTime}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="function-end-time">End Time</label>
          <input
            id="function-end-time"
            name="endTime"
            type="time"
            value={fields.endTime}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="function-venue">Venue</label>
        <input
          id="function-venue"
          name="venue"
          type="text"
          placeholder="e.g., Royal Palace"
          value={fields.venue}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="function-notes">Notes</label>
        <textarea
          id="function-notes"
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
          {submitting ? 'Saving…' : fn ? 'Save Changes' : 'Add Function'}
        </button>
      </div>
    </form>
  );
}
