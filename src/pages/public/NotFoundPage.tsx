import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function NotFoundPage(): JSX.Element {
  return (
    <EmptyState
      title="Page not found"
      description="The page you're looking for doesn't exist, or the link may be out of date."
      action={
        <Link to="/">
          <Button>Return home</Button>
        </Link>
      }
    />
  );
}
