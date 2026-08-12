import { Navigate, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { HomePage } from '@/pages/public/HomePage';
import { LoginPage } from '@/pages/public/LoginPage';
import { SignupPage } from '@/pages/public/SignupPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { EventListPage } from '@/pages/dashboard/EventListPage';
import { EventDetailPage } from '@/pages/dashboard/EventDetailPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

export function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route element={<PageShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/events" element={<EventListPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
