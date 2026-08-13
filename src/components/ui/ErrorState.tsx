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
    <div className="resource-notice" role="alert">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}
