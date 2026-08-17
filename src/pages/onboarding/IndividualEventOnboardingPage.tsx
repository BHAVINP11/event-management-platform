import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIndividualEvent, OnboardingError } from '@/features/onboarding/services/onboardingService';
import { TIMEZONES } from '@/lib/timezones';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'social', label: 'Social Gathering' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'private', label: 'Private Celebration' },
  { value: 'other', label: 'Other' }
];

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz }));

/**
 * `/onboarding/event`. Collects only the fields the existing `Event`
 * model/`createIndividualEvent` Cloud Function accept — name, type,
 * description, startDate, endDate, timezone, venueName, venueAddress
 * (timezone is required by the existing validation, so it stays even
 * though the brief's illustrative example only names three fields) — and
 * hands off to the existing onboarding service unchanged.
 */
export function IndividualEventOnboardingPage(): JSX.Element {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    type: 'wedding',
    description: '',
    startDate: '',
    endDate: '',
    timezone: 'America/New_York',
    venueName: '',
    venueAddress: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<OnboardingError | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate that startDate is provided
      if (!formData.startDate) {
        setError({
          code: 'invalid_input',
          message: 'Start date is required',
          friendlyMessage: 'Please select a start date.'
        });
        setLoading(false);
        return;
      }

      const input = {
        name: formData.name,
        type: formData.type,
        ...(formData.description && { description: formData.description }),
        startDate: formData.startDate,
        ...(formData.endDate && { endDate: formData.endDate }),
        timezone: formData.timezone,
        ...(formData.venueName && { venueName: formData.venueName }),
        ...(formData.venueAddress && { venueAddress: formData.venueAddress })
      };

      await createIndividualEvent(input);

      // Success - navigate to dashboard
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err as OnboardingError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card auth-card--wide" padded>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Let&apos;s set up your event</h1>
          <p className="auth-card-subtitle">Just the basics for now — you can fill in the rest later.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner" role="alert">
              {error.friendlyMessage}
            </div>
          )}

          <Input
            label="Event Name *"
            name="name"
            placeholder="e.g., Sarah & Mike's Wedding"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <Select
            label="Event Type *"
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={loading}
            options={EVENT_TYPES}
          />

          <div className="field">
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="field-control"
              placeholder="Any special details about your event?"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="auth-form-row">
            <Input
              label="Start Date *"
              name="startDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <Input
              label="End Date"
              name="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <Select
            label="Timezone *"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            disabled={loading}
            options={TIMEZONE_OPTIONS}
          />

          <div className="auth-form-row">
            <Input
              label="Venue Name"
              name="venueName"
              placeholder="e.g., Grand Ballroom"
              value={formData.venueName}
              onChange={handleChange}
              disabled={loading}
            />
            <Input
              label="Venue Address"
              name="venueAddress"
              placeholder="e.g., 123 Main St"
              value={formData.venueAddress}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="auth-form-actions">
            <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/onboarding')} disabled={loading}>
              Back
            </Button>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? 'Creating…' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
