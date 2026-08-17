import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createOrganization, OnboardingError } from '@/features/onboarding/services/onboardingService';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * `/onboarding/planner`. Collects only the fields the existing
 * `Organization` model/`createOrganization` Cloud Function accept —
 * name, slug, description, contactEmail, contactPhone — and hands off to
 * the existing onboarding service unchanged.
 */
export function PlannerOnboardingPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    contactEmail: user?.email || '',
    contactPhone: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<OnboardingError | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate slug from name
    if (name === 'name' && !formData.slug) {
      const autoSlug = value
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setFormData((prev) => ({
        ...prev,
        slug: autoSlug
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Only send non-empty fields
      const input = {
        name: formData.name,
        slug: formData.slug,
        ...(formData.description && { description: formData.description }),
        ...(formData.contactEmail && { contactEmail: formData.contactEmail }),
        ...(formData.contactPhone && { contactPhone: formData.contactPhone })
      };

      await createOrganization(input);

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
      <Card className="auth-card" padded>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Set up your organization</h1>
          <p className="auth-card-subtitle">Tell us about your business.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner" role="alert">
              {error.friendlyMessage}
            </div>
          )}

          <Input
            label="Organization Name *"
            name="name"
            placeholder="e.g., Royal Events"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <Input
            label="Organization URL *"
            name="slug"
            placeholder="e.g., royal-events"
            value={formData.slug}
            onChange={handleChange}
            required
            disabled={loading}
            hint="Alphanumeric and hyphens only"
          />

          <div className="field">
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="field-control"
              placeholder="What services do you provide?"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              disabled={loading}
            />
          </div>

          <Input
            label="Email"
            name="contactEmail"
            type="email"
            placeholder="contact@example.com"
            value={formData.contactEmail}
            onChange={handleChange}
            disabled={loading}
          />

          <Input
            label="Phone"
            name="contactPhone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.contactPhone}
            onChange={handleChange}
            disabled={loading}
          />

          <div className="auth-form-actions">
            <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/onboarding')} disabled={loading}>
              Back
            </Button>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? 'Creating…' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
