import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function OnboardingTypePage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<'planner' | 'individual' | null>(null);

  const handleContinue = (): void => {
    if (selectedType === 'planner') {
      navigate('/onboarding/planner');
    } else if (selectedType === 'individual') {
      navigate('/onboarding/event');
    }
  };

  return (
    <section className="onboarding-container">
      <div className="onboarding-content">
        <h1>Welcome, {user?.firstName}!</h1>
        <p className="onboarding-subtitle">What are you here to do?</p>

        <div className="onboarding-choices">
          <button
            className={`choice-button ${selectedType === 'planner' ? 'active' : ''}`}
            onClick={() => setSelectedType('planner')}
          >
            <h3>I manage events</h3>
            <p>Professional event planning</p>
          </button>

          <button
            className={`choice-button ${selectedType === 'individual' ? 'active' : ''}`}
            onClick={() => setSelectedType('individual')}
          >
            <h3>I&apos;m planning my own event</h3>
            <p>Organize your personal celebration</p>
          </button>
        </div>

        <div className="onboarding-actions">
          <button
            className="btn-primary"
            disabled={!selectedType}
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
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
          text-align: center;
        }

        .onboarding-content h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
          color: #333;
        }

        .onboarding-subtitle {
          margin: 0 0 2rem 0;
          font-size: 1.1rem;
          color: #666;
        }

        .onboarding-choices {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 2rem 0;
        }

        .choice-button {
          padding: 1.5rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .choice-button:hover {
          border-color: #0066cc;
          background: #f0f7ff;
        }

        .choice-button.active {
          border-color: #0066cc;
          background: #e6f2ff;
        }

        .choice-button h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #333;
        }

        .choice-button p {
          margin: 0;
          font-size: 0.9rem;
          color: #666;
        }

        .onboarding-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          justify-content: center;
        }

        .btn-primary {
          padding: 0.75rem 2rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0052a3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </section>
  );
}
