import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';
import { AuthProvider } from '@/features/auth/hooks/useAuth';
import { ToastProvider } from '@/components/ui/Toast';

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
