import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type OnboardingType = 'planner' | 'individual';

/**
 * `/onboarding`. A pure navigation choice — nothing is persisted here.
 * The selection only decides which existing creation flow to send the
 * user through next (`/onboarding/planner` creates an Organization,
 * `/onboarding/event` creates an individual Event); neither the domain
 * model nor any backend field records "planner" vs. "couple" as its own
 * concept. See the STEP UI-02 report for why no such field is needed.
 */
export function OnboardingTypePage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<OnboardingType | null>(null);

  const handleContinue = (): void => {
    if (selectedType === 'planner') {
      navigate('/onboarding/planner');
    } else if (selectedType === 'individual') {
      navigate('/onboarding/event');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card-header">
          <h1 className="auth-card-title">Welcome{user?.firstName ? `, ${user.firstName}` : ''}!</h1>
          <p className="auth-card-subtitle">How will you use Event Management Platform?</p>
        </div>

        <div className="auth-choice-grid">
          <button
            type="button"
            className="auth-choice"
            aria-pressed={selectedType === 'planner'}
            onClick={() => setSelectedType('planner')}
          >
            <Card
              padded
              interactive
              className={selectedType === 'planner' ? 'auth-choice-card auth-choice-card--selected' : 'auth-choice-card'}
            >
              <h3>Event Planner</h3>
              <p>Manage multiple events and clients.</p>
            </Card>
          </button>

          <button
            type="button"
            className="auth-choice"
            aria-pressed={selectedType === 'individual'}
            onClick={() => setSelectedType('individual')}
          >
            <Card
              padded
              interactive
              className={
                selectedType === 'individual' ? 'auth-choice-card auth-choice-card--selected' : 'auth-choice-card'
              }
            >
              <h3>Planning my own event</h3>
              <p>Manage your wedding or event with your family.</p>
            </Card>
          </button>
        </div>

        <Button size="lg" fullWidth disabled={!selectedType} onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
