import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { eventSettingsService } from '@/app/services';
import { EventSettingsFormInput } from '@/features/events/types/eventSettings';
import { EventDetailView } from '@/features/events/types/eventAccess';
import { EventSettingsError } from '@/lib/appError';
import { parseIsoDate } from '@/lib/date';
import { EventStatus, EventType } from '@/types/event';
import { eventStatusLabel, eventTypeLabel } from '@/lib/labels';
import { TIMEZONES } from '@/lib/timezones';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const EVENT_TYPE_OPTIONS = Object.values(EventType).map((type) => ({ value: type, label: eventTypeLabel(type) }));
const EVENT_STATUS_OPTIONS = Object.values(EventStatus).map((status) => ({
  value: status,
  label: eventStatusLabel(status)
}));
const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz }));

interface FormFields {
  name: string;
  type: EventType;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  status: EventStatus;
}

/** Converts a stored ISO date string to the `YYYY-MM-DDTHH:mm` shape a `datetime-local` input needs. */
function toDateTimeLocalValue(iso: string | undefined): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) {
    return '';
  }
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
    parsed.getHours()
  )}:${pad(parsed.getMinutes())}`;
}

function toFields(event: EventDetailView): FormFields {
  return {
    name: event.name,
    type: event.type,
    description: event.description ?? '',
    startDate: toDateTimeLocalValue(event.startDate),
    endDate: toDateTimeLocalValue(event.endDate),
    timezone: event.timezone ?? TIMEZONES[0],
    venueName: event.venueName ?? '',
    venueAddress: event.venueAddress ?? '',
    status: event.status
  };
}

function toFormInput(fields: FormFields): EventSettingsFormInput {
  return {
    name: fields.name,
    type: fields.type,
    startDate: fields.startDate,
    timezone: fields.timezone,
    status: fields.status,
    ...(fields.description && { description: fields.description }),
    ...(fields.endDate && { endDate: fields.endDate }),
    ...(fields.venueName && { venueName: fields.venueName }),
    ...(fields.venueAddress && { venueAddress: fields.venueAddress })
  };
}

/**
 * Cover photo upload/replace/remove — a self-contained sub-section since
 * it saves immediately (through `updateEventCoverImage`) rather than
 * waiting on the surrounding form's own submit.
 */
function CoverPhotoField({
  eventId,
  coverImageUrl,
  onChange
}: {
  eventId: string;
  coverImageUrl: string | undefined;
  onChange: (url: string | undefined) => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const url = await eventSettingsService.uploadCoverImage(eventId, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof EventSettingsError ? err.friendlyMessage : "We couldn't upload that photo right now.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await eventSettingsService.removeCoverImage(eventId);
      onChange(undefined);
    } catch (err) {
      setError(err instanceof EventSettingsError ? err.friendlyMessage : "We couldn't remove that photo right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
      <span className="field-label">Cover photo</span>

      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          style={{
            width: '100%',
            maxHeight: 160,
            objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-2)'
          }}
        />
      )}

      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-2)' }}>
          {error}
        </div>
      )}

      <div className="auth-form-row">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? 'Uploading…' : coverImageUrl ? 'Replace photo' : 'Upload photo'}
        </Button>
        {coverImageUrl && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={handleRemove}>
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

/**
 * Event Settings form — the content of the Modal `EventHero`'s "Edit
 * event" button opens. Only mounted for owner/planner (`onUpdateEvent`
 * independently re-verifies the role server-side regardless). Fields
 * mirror event creation exactly, plus `status`, since editing is the same
 * data with a lifecycle field added.
 */
export function EventSettingsForm({
  event,
  onSaved,
  onCancel
}: {
  event: EventDetailView;
  onSaved: (message: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [fields, setFields] = useState<FormFields>(() => toFields(event));
  const [coverImageUrl, setCoverImageUrl] = useState(event.coverImageUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    fieldEvent: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = fieldEvent.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (formEvent: FormEvent): Promise<void> => {
    formEvent.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await eventSettingsService.updateEvent(event.id, toFormInput(fields));
      onSaved('Event details updated.');
    } catch (err) {
      setError(
        err instanceof EventSettingsError ? err.friendlyMessage : "We couldn't save these changes right now."
      );
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

      <CoverPhotoField eventId={event.id} coverImageUrl={coverImageUrl} onChange={setCoverImageUrl} />

      <Input
        label="Event name *"
        name="name"
        value={fields.name}
        onChange={handleChange}
        required
        disabled={submitting}
      />

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Event type *"
          name="type"
          value={fields.type}
          onChange={handleChange}
          disabled={submitting}
          options={EVENT_TYPE_OPTIONS}
        />
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Status *"
          name="status"
          value={fields.status}
          onChange={handleChange}
          disabled={submitting}
          options={EVENT_STATUS_OPTIONS}
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Start date *"
          name="startDate"
          type="datetime-local"
          value={fields.startDate}
          onChange={handleChange}
          required
          disabled={submitting}
        />
        <Select
          label="Timezone *"
          name="timezone"
          value={fields.timezone}
          onChange={handleChange}
          disabled={submitting}
          options={TIMEZONE_OPTIONS}
        />
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="End date"
          name="endDate"
          type="datetime-local"
          value={fields.endDate}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Input
          label="Venue name"
          name="venueName"
          value={fields.venueName}
          onChange={handleChange}
          disabled={submitting}
        />
        <Input
          label="Venue address"
          name="venueAddress"
          value={fields.venueAddress}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label className="field-label" htmlFor="event-settings-description">
          Description
        </label>
        <textarea
          id="event-settings-description"
          name="description"
          className="field-control"
          rows={3}
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="auth-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
