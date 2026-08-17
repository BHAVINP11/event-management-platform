export interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * A generic inline spinner + label — for a modal, a panel, or a full
 * page's initial load alike. Every data-driven page in the app uses this
 * for its loading state.
 */
export function LoadingState({ label = 'Loading…', size = 'md' }: LoadingStateProps): JSX.Element {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className={['loading-spinner', size === 'sm' && 'loading-spinner--sm'].filter(Boolean).join(' ')} />
      <span>{label}</span>
    </div>
  );
}
