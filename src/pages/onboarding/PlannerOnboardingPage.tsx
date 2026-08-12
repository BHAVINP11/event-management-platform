import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createOrganization, OnboardingError } from '@/features/onboarding/services/onboardingService';

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
    <section className="onboarding-container">
      <div className="onboarding-content">
        <h1>Set up your organization</h1>
        <p className="onboarding-subtitle">Tell us about your business</p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {error && (
            <div className="error-message">
              <p>{error.friendlyMessage}</p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Organization Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Royal Events"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug">Organization URL *</label>
            <input
              id="slug"
              name="slug"
              type="text"
              placeholder="e.g., royal-events"
              value={formData.slug}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <small>Alphanumeric and hyphens only</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="What services do you provide?"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactEmail">Email</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="contact@example.com"
              value={formData.contactEmail}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactPhone">Phone</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.contactPhone}
              onChange={handleChange}
              disabled={loading}
            />
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
              {loading ? 'Creating...' : 'Create Organization'}
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
          max-width: 500px;
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

        .form-group label {
          font-weight: 500;
          color: #333;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .form-group input:disabled,
        .form-group textarea:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .form-group small {
          color: #999;
          font-size: 0.8rem;
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
      `}</style>
    </section>
  );
}
