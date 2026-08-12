import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
