import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';
import { AuthProvider } from '@/features/auth/hooks/useAuth';

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
