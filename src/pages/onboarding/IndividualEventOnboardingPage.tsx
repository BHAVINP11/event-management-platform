import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIndividualEvent, OnboardingError } from '@/features/onboarding/services/onboardingService';

const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'social', label: 'Social Gathering' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'private', label: 'Private Celebration' },
  { value: 'other', label: 'Other' }
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Australia/Melbourne'
];

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
    <section className="onboarding-container">
      <div className="onboarding-content">
        <h1>Create your event</h1>
        <p className="onboarding-subtitle">Let&apos;s get started with the basics</p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {error && (
            <div className="error-message">
              <p>{error.friendlyMessage}</p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Event Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Sarah &amp; Mike&apos;s Wedding"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Event Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={loading}
            >
              {EVENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Any special details about your event?"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                id="startDate"
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                id="endDate"
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone *</label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              disabled={loading}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="venueName">Venue Name</label>
              <input
                id="venueName"
                name="venueName"
                type="text"
                placeholder="e.g., Grand Ballroom"
                value={formData.venueName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="venueAddress">Venue Address</label>
              <input
                id="venueAddress"
                name="venueAddress"
                type="text"
                placeholder="e.g., 123 Main St"
                value={formData.venueAddress}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/onboarding')}
              disabled={loading}
            >
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .onboarding-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 100px);
          padding: 2rem;
          background: #f5f5f5;
        }

        .onboarding-content {
          width: 100%;
          max-width: 600px;
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .onboarding-content h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          color: #333;
        }

        .onboarding-subtitle {
          margin: 0 0 2rem 0;
          color: #666;
          font-size: 0.95rem;
        }

        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .error-message {
          padding: 1rem;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c33;
          margin-bottom: 1rem;
        }

        .error-message p {
          margin: 0;
          font-size: 0.9rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          font-weight: 500;
          color: #333;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .form-group input:disabled,
        .form-group textarea:disabled,
        .form-group select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          flex: 1;
        }

        .btn-primary {
          background: #0066cc;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0052a3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-secondary:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
