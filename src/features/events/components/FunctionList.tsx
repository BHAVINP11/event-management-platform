import { EventFunction } from '@/types/eventFunction';
import { eventFunctionStatusLabel } from '@/lib/labels';
import { eventFunctionStatusBadgeVariant } from '@/lib/badgeVariants';
import { formatEventDate } from '@/lib/date';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

function formatTimeRange(startTime: string | undefined, endTime: string | undefined): string | null {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  return startTime ?? endTime ?? null;
}

function FunctionCard({
  fn,
  canManage,
  onEdit,
  onDelete
}: {
  fn: EventFunction;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  const date = formatEventDate(fn.date);
  const timeRange = formatTimeRange(fn.startTime, fn.endTime);

  return (
    <Card padded className="function-card">
      <div className="function-card-header">
        <h3>{fn.name}</h3>
        <Badge variant={eventFunctionStatusBadgeVariant(fn.status)}>{eventFunctionStatusLabel(fn.status)}</Badge>
      </div>

      <div className="function-meta">
        {date && <span>{date}</span>}
        {timeRange && <span>{timeRange}</span>}
        {fn.venue && <span>{fn.venue}</span>}
      </div>

      {fn.description && <p className="function-description">{fn.description}</p>}

      {canManage && (
        <div className="function-card-actions">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
}

/** The function/ceremony cards for `/events/:eventId/functions`. `functions` is expected to already be sorted. */
export function FunctionList({
  functions,
  canManage,
  onAdd,
  onEdit,
  onDelete
}: {
  functions: readonly EventFunction[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (fn: EventFunction) => void;
  onDelete: (fn: EventFunction) => void;
}): JSX.Element {
  if (functions.length === 0) {
    return (
      <EmptyState
        title="No functions yet"
        description="Add your first function to start organizing the event."
        action={canManage ? <Button onClick={onAdd}>+ Add Function</Button> : undefined}
      />
    );
  }

  return (
    <div className="functions-grid">
      {functions.map((fn) => (
        <FunctionCard key={fn.id} fn={fn} canManage={canManage} onEdit={() => onEdit(fn)} onDelete={() => onDelete(fn)} />
      ))}
    </div>
  );
}
