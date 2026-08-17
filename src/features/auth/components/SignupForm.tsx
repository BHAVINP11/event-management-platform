import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signUp } from '@/features/auth/services/authService';
import { mapFirebaseAuthError } from '@/features/auth/services/errorMapper';
import { getSafeRedirectTarget } from '@/lib/redirectTarget';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const MIN_PASSWORD_LENGTH = 6;

/**
 * `/signup`. Collects exactly the fields `SignUpPayload` accepts
 * (first name, last name, email, password) — `confirmPassword` is a
 * client-only check, never sent to the backend. Uses the existing
 * `signUp` auth service unchanged.
 */
export function SignupForm(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return 'Please complete all fields.';
    }
    if (!email.includes('@')) {
      return 'Please enter a valid email address.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await signUp({ firstName, lastName, email, password });
      navigate(getSafeRedirectTarget(searchParams) ?? '/onboarding');
    } catch (authError) {
      setError(mapFirebaseAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card" padded>
        <div className="auth-card-header">
          <h1 className="auth-card-title">Create your account</h1>
          <p className="auth-card-subtitle">Let&apos;s get your event planning started.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner" role="alert">
              {error}
            </div>
          )}

          <div className="auth-form-row">
            <Input
              label="First name"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              disabled={loading}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={loading}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            endAdornment={
              <button
                type="button"
                className="field-toggle-visibility"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
          />

          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={loading}
          />

          <Button type="submit" size="lg" fullWidth disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
