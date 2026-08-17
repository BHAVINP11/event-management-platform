import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Friendly failure state with a retry affordance.
 *
 * Only the message supplied by an application-level error is shown; provider
 * error codes, stack traces, and internal identifiers never reach this point.
 */
export function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <Card padded className="error-state" role="alert">
      <p className="error-state-title">Something went wrong</p>
      <p className="error-state-message">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </Card>
  );
}
