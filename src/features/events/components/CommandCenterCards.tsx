import { EventCommandCenterData } from '@/features/events/hooks/useEventCommandCenter';
import { Card } from '@/components/ui/Card';
import { IconSparkle } from '@/components/ui/icons';
import { formatEventDate } from '@/lib/date';

/** "What's next" — the soonest function/ceremony, or a calm placeholder when none is scheduled yet. */
export function NextUpCard({ data }: { data: EventCommandCenterData }): JSX.Element {
  const fn = data.nextUp;

  return (
    <Card padded className="command-card">
      <span className="command-card-label">
        <IconSparkle /> Next Up
      </span>
      {fn ? (
        <>
          <h3 className="next-up-name">{fn.name}</h3>
          <div className="next-up-meta">
            {fn.date && (
              <span>
                {formatEventDate(fn.date)}
                {fn.startTime ? ` · ${fn.startTime}` : ''}
              </span>
            )}
            {fn.venue && <span>{fn.venue}</span>}
          </div>
        </>
      ) : (
        <>
          <p className="command-empty-title">Nothing scheduled yet</p>
          <p className="command-empty">Add a function to see it here.</p>
        </>
      )}
    </Card>
  );
}

/** "What needs attention" — tasks due soon, pending expenses, vendors awaiting confirmation; a calm empty state when there's nothing. */
export function AttentionCard({ data }: { data: EventCommandCenterData }): JSX.Element {
  return (
    <Card padded className="command-card">
      <span className="command-card-label">Needs Attention</span>
      {data.attentionItems.length > 0 ? (
        <ul className="attention-list">
          {data.attentionItems.map((item) => (
            <li key={item.key}>
              <span className="attention-list-dot" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="command-empty-title">You&apos;re all caught up ✨</p>
          <p className="command-empty">Nothing needs your attention right now.</p>
        </>
      )}
    </Card>
  );
}
