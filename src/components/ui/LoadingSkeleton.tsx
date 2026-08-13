/** Placeholder blocks shown while a resource view loads. */
export function LoadingSkeleton({ cards = 2 }: { cards?: number }): JSX.Element {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only-text">Loading…</span>
      <div className="resource-skeleton-line" style={{ width: '40%' }} />
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="resource-skeleton-card" />
      ))}
    </div>
  );
}
