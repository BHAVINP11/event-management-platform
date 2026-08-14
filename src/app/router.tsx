import { Navigate, Route, Routes } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { HomePage } from '@/pages/public/HomePage';
import { LoginPage } from '@/pages/public/LoginPage';
import { SignupPage } from '@/pages/public/SignupPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { EventWorkspacePage } from '@/features/events/pages/EventWorkspacePage';
import { EventCreatePage } from '@/features/events/pages/EventCreatePage';
import { EventPeoplePage } from '@/features/events/pages/EventPeoplePage';
import { GuestsPage } from '@/features/events/pages/GuestsPage';
import { FunctionsPage } from '@/features/events/pages/FunctionsPage';
import { ExpensesPage } from '@/features/events/pages/ExpensesPage';
import { InvitationAcceptPage } from '@/features/events/pages/InvitationAcceptPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { OnboardingTypePage } from '@/pages/onboarding/OnboardingTypePage';
import { PlannerOnboardingPage } from '@/pages/onboarding/PlannerOnboardingPage';
import { IndividualEventOnboardingPage } from '@/pages/onboarding/IndividualEventOnboardingPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';

export function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route element={<PageShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingTypePage /></ProtectedRoute>} />
        <Route path="/onboarding/planner" element={<ProtectedRoute><PlannerOnboardingPage /></ProtectedRoute>} />
        <Route path="/onboarding/event" element={<ProtectedRoute><IndividualEventOnboardingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        {/* The dashboard is the single list of accessible events. */}
        <Route path="/events" element={<Navigate to="/dashboard" replace />} />
        <Route path="/events/new" element={<ProtectedRoute><EventCreatePage /></ProtectedRoute>} />
        <Route path="/events/:eventId" element={<ProtectedRoute><EventWorkspacePage /></ProtectedRoute>} />
        <Route path="/events/:eventId/people" element={<ProtectedRoute><EventPeoplePage /></ProtectedRoute>} />
        <Route path="/events/:eventId/guests" element={<ProtectedRoute><GuestsPage /></ProtectedRoute>} />
        <Route path="/events/:eventId/functions" element={<ProtectedRoute><FunctionsPage /></ProtectedRoute>} />
        <Route path="/events/:eventId/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
        {/* Not wrapped in ProtectedRoute: an unauthenticated visitor must be
            sent through login/signup with a way back to this exact URL,
            which the page itself handles (see InvitationAcceptPage). */}
        <Route path="/invitations/:invitationId" element={<InvitationAcceptPage />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
