export interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * A generic inline spinner + label — for a modal, a panel, or any small
 * area waiting on data. For a full resource page's initial load, prefer
 * `LoadingSkeleton`, which mirrors the shape of the content about to
 * appear rather than showing an indeterminate spinner.
 */
export function LoadingState({ label = 'Loading…', size = 'md' }: LoadingStateProps): JSX.Element {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className={['loading-spinner', size === 'sm' && 'loading-spinner--sm'].filter(Boolean).join(' ')} />
      <span>{label}</span>
    </div>
  );
}
