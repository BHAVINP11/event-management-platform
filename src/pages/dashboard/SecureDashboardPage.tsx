import { useAuth } from '@/features/auth/hooks/useAuth';

export function SecureDashboardPage(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <section>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.displayName ?? 'user'}.</p>
      <p>This is a protected dashboard placeholder.</p>
    </section>
  );
}
