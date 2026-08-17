import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LoadingState } from '@/components/ui/LoadingState';

export function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingState label="Loading…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
