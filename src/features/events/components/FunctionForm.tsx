import { FormEvent, useState } from 'react';
import { functionService } from '@/app/services';
import { FunctionFormInput } from '@/features/events/types/functions';
import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';
import { FunctionError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

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
 * Add/edit function/ceremony form — the content of the Modal that hosts
 * it. Only mounted for users with `canManage` (owner/planner) —
 * createFunction/updateFunction independently re-verify the role
 * server-side regardless. `eventId`/`createdBy`/`id`/`createdAt` are
 * never part of this form; the Cloud Function derives or preserves them
 * itself.
 */
export function FunctionForm({
  eventId,
  fn,
  onSaved,
  onCancel
}: {
  eventId: string;
  fn?: EventFunction;
  onSaved: (message: string) => void;
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
        onSaved('Function updated.');
      } else {
        await functionService.createFunction(eventId, input);
        onSaved('Function added.');
      }
    } catch (err) {
      setError(err instanceof FunctionError ? err.friendlyMessage : "We couldn't save this function right now.");
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

      <div style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="function-description">
          Description
        </label>
        <textarea
          id="function-description"
          name="description"
          className="field-control"
          rows={2}
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Date"
          name="date"
          type="date"
          value={fields.date}
          onChange={handleChange}
          disabled={submitting}
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
          label="Start Time"
          name="startTime"
          type="time"
          value={fields.startTime}
          onChange={handleChange}
          disabled={submitting}
        />
        <Input
          label="End Time"
          name="endTime"
          type="time"
          value={fields.endTime}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Venue"
          name="venue"
          placeholder="e.g., Royal Palace"
          value={fields.venue}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="function-notes">
          Notes
        </label>
        <textarea
          id="function-notes"
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
          {submitting ? 'Saving…' : fn ? 'Save Changes' : 'Add Function'}
        </Button>
      </div>
    </form>
  );
}
