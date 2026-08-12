import { Outlet } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SiteHeader } from '@/components/layout/SiteHeader';

export function PageShell() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Container>
          <Outlet />
        </Container>
      </main>
    </div>
  );
}
