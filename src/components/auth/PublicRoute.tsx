import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getSafeRedirectTarget } from '@/lib/redirectTarget';

export function PublicRoute({ children }: { children: JSX.Element }): JSX.Element {
  const { loading, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to={getSafeRedirectTarget(searchParams) ?? '/dashboard'} replace />;
  }

  return children;
}
