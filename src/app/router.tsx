import { Navigate, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { HomePage } from '@/pages/public/HomePage';
import { LoginPage } from '@/pages/public/LoginPage';
import { SignupPage } from '@/pages/public/SignupPage';
import { SecureDashboardPage } from '@/pages/dashboard/SecureDashboardPage';
import { EventListPage } from '@/pages/dashboard/EventListPage';
import { EventDetailPage } from '@/pages/dashboard/EventDetailPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';

export function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route element={<PageShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><SecureDashboardPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventListPage /></ProtectedRoute>} />
        <Route path="/events/:eventId" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
