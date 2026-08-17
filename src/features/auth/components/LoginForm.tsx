import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { signIn } from '@/features/auth/services/authService';
import { mapFirebaseAuthError } from '@/features/auth/services/errorMapper';
import { getSafeRedirectTarget } from '@/lib/redirectTarget';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * `/login`. Uses the existing `signIn` auth service and
 * `mapFirebaseAuthError` unchanged — this component only adds
 * presentation (design system, show/hide password) around them.
 */
export function LoginForm(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn({ email, password });
      navigate(getSafeRedirectTarget(searchParams) ?? '/dashboard');
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
          <h1 className="auth-card-title">Welcome back</h1>
          <p className="auth-card-subtitle">Sign in to continue to your events.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner" role="alert">
              {error}
            </div>
          )}

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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            disabled={loading}
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

          <Button type="submit" size="lg" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="auth-footer">
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
