import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventCreationOrganizations } from '@/features/events/hooks/useEventCreationOrganizations';
import { eventCreationService } from '@/app/services';
import { EventCreationFormInput, EventCreationOrganizationOption } from '@/features/events/types/eventCreation';
import { EventCreationError } from '@/lib/appError';
import { EventType } from '@/types/event';
import { eventTypeLabel } from '@/lib/labels';
import { TIMEZONES, detectTimezone } from '@/lib/timezones';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const EVENT_TYPE_OPTIONS = Object.values(EventType).map((type) => ({
  value: type,
  label: eventTypeLabel(type)
}));

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz }));

type CreationTarget =
  | { kind: 'individual' }
  | { kind: 'organization'; organizationId: string; organizationName: string };

type Stage =
  | { name: 'entry' }
  | { name: 'selectOrganization' }
  | { name: 'form'; target: CreationTarget };

interface FormFields {
  name: string;
  type: EventType;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
}

const emptyForm: FormFields = {
  name: '',
  type: EventType.Wedding,
  description: '',
  startDate: '',
  endDate: '',
  timezone: detectTimezone(),
  venueName: '',
  venueAddress: ''
};

function toFormInput(fields: FormFields): EventCreationFormInput {
  return {
    name: fields.name,
    type: fields.type,
    startDate: fields.startDate,
    timezone: fields.timezone,
    ...(fields.description && { description: fields.description }),
    ...(fields.endDate && { endDate: fields.endDate }),
    ...(fields.venueName && { venueName: fields.venueName }),
    ...(fields.venueAddress && { venueAddress: fields.venueAddress })
  };
}

/** The two entry points offered when the user can create for an organization too. */
function EntryChoice({
  onChooseIndividual,
  onChooseOrganization
}: {
  onChooseIndividual: () => void;
  onChooseOrganization: () => void;
}): JSX.Element {
  return (
    <>
      <h1>Create an event</h1>
      <p className="event-creation-subtitle">Who is this event for?</p>
      <div className="creation-options">
        <button type="button" className="creation-option" onClick={onChooseIndividual}>
          <h3>My own event</h3>
          <p>A personal celebration you&apos;re planning yourself.</p>
        </button>
        <button type="button" className="creation-option" onClick={onChooseOrganization}>
          <h3>An organization event</h3>
          <p>An event you&apos;re creating on behalf of your organization.</p>
        </button>
      </div>
    </>
  );
}

function OrganizationSelector({
  organizations,
  onBack,
  onContinue
}: {
  organizations: readonly EventCreationOrganizationOption[];
  onBack: () => void;
  onContinue: (organization: EventCreationOrganizationOption) => void;
}): JSX.Element {
  const [selectedId, setSelectedId] = useState(organizations[0]?.organizationId ?? '');

  return (
    <>
      <h1>Choose an organization</h1>
      <p className="event-creation-subtitle">Which organization is this event for?</p>
      <ul className="org-select-list">
        {organizations.map((organization) => (
          <li key={organization.organizationId} className="org-select-item">
            <input
              id={`org-${organization.organizationId}`}
              type="radio"
              name="organization"
              value={organization.organizationId}
              checked={selectedId === organization.organizationId}
              onChange={() => setSelectedId(organization.organizationId)}
            />
            <label className="org-select-item-label" htmlFor={`org-${organization.organizationId}`}>
              <strong>{organization.name}</strong>
            </label>
          </li>
        ))}
      </ul>
      <div className="auth-form-actions">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          disabled={!selectedId}
          onClick={() => {
            const organization = organizations.find((o) => o.organizationId === selectedId);
            if (organization) {
              onContinue(organization);
            }
          }}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

function EventForm({
  target,
  onBack,
  onCreated
}: {
  target: CreationTarget;
  onBack: (() => void) | null;
  onCreated: (eventId: string) => void;
}): JSX.Element {
  const [fields, setFields] = useState<FormFields>(emptyForm);
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
      const input = toFormInput(fields);
      const eventId =
        target.kind === 'individual'
          ? await eventCreationService.createIndividualEvent(input)
          : await eventCreationService.createOrganizationEvent(target.organizationId, input);

      onCreated(eventId);
    } catch (err) {
      setError(err instanceof EventCreationError ? err.friendlyMessage : "We couldn't create your event right now.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1>Create an event</h1>
      <p className="event-creation-subtitle">
        {target.kind === 'organization' ? `For ${target.organizationName}` : 'A few basics to get started'}
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </div>
        )}

        <Input
          label="Event name *"
          name="name"
          placeholder="e.g., Sarah & Mike's Wedding"
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
            placeholder="e.g., Grand Ballroom"
            value={fields.venueName}
            onChange={handleChange}
            disabled={submitting}
          />
          <Input
            label="Venue address"
            name="venueAddress"
            placeholder="e.g., 123 Main St"
            value={fields.venueAddress}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label className="field-label" htmlFor="event-description">
            Description
          </label>
          <textarea
            id="event-description"
            name="description"
            className="field-control"
            rows={3}
            value={fields.description}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="auth-form-actions">
          {onBack && (
            <Button type="button" variant="secondary" onClick={onBack} disabled={submitting}>
              Back
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Event'}
          </Button>
        </div>
      </form>
    </>
  );
}

/**
 * Entry point for creating an event.
 *
 * The individual/organization choice — and, when there is more than one
 * eligible organization, which one — is decided here for the user's
 * convenience only. The Cloud Function re-verifies organization access
 * independently before writing anything, so nothing here is trusted as an
 * authorization decision.
 */
export function EventCreatePage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, reload } = useEventCreationOrganizations(user?.id ?? null);
  const [stage, setStage] = useState<Stage | null>(null);

  if (state.status === 'loading') {
    return (
      <section className="event-creation-page">
        <LoadingState label="Loading…" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="event-creation-page">
        <ErrorState message={state.message} onRetry={reload} />
      </section>
    );
  }

  const organizations = state.organizations;
  const currentStage: Stage =
    stage ?? (organizations.length > 0 ? { name: 'entry' } : { name: 'form', target: { kind: 'individual' } });

  const goToDashboard = (): void => navigate('/dashboard');
  const onCreated = (eventId: string): void => navigate(`/events/${eventId}`);

  return (
    <section className="event-creation-page">
      {currentStage.name === 'entry' && (
        <EntryChoice
          onChooseIndividual={() => setStage({ name: 'form', target: { kind: 'individual' } })}
          onChooseOrganization={() =>
            setStage(
              organizations.length === 1
                ? {
                    name: 'form',
                    target: {
                      kind: 'organization',
                      organizationId: organizations[0].organizationId,
                      organizationName: organizations[0].name
                    }
                  }
                : { name: 'selectOrganization' }
            )
          }
        />
      )}

      {currentStage.name === 'selectOrganization' && (
        <OrganizationSelector
          organizations={organizations}
          onBack={() => setStage({ name: 'entry' })}
          onContinue={(organization) =>
            setStage({
              name: 'form',
              target: {
                kind: 'organization',
                organizationId: organization.organizationId,
                organizationName: organization.name
              }
            })
          }
        />
      )}

      {currentStage.name === 'form' && (
        <EventForm
          target={currentStage.target}
          onBack={organizations.length > 0 ? () => setStage({ name: 'entry' }) : goToDashboard}
          onCreated={onCreated}
        />
      )}
    </section>
  );
}
