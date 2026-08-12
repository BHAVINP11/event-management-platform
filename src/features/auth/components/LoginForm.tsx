import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '@/features/auth/services/authService';
import { mapFirebaseAuthError } from '@/features/auth/services/errorMapper';

export function LoginForm(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn({ email, password });
      navigate('/dashboard');
    } catch (authError) {
      setError(mapFirebaseAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1>Login</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: 420 }}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
        </label>
        {error ? <p style={{ color: 'red' }}>{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p>
        Need an account? <Link to="/signup">Sign up</Link>
      </p>
    </section>
  );
}
