import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';
import { eventFunctionStatusLabel } from '@/lib/labels';
import { formatEventDate } from '@/lib/date';

const statusTagClass: Record<EventFunction['status'], string> = {
  [EventFunctionStatus.Planned]: 'status-draft',
  [EventFunctionStatus.Confirmed]: 'status-active',
  [EventFunctionStatus.Completed]: 'status-active',
  [EventFunctionStatus.Cancelled]: 'status-archived'
};

function formatTimeRange(startTime: string | undefined, endTime: string | undefined): string | null {
  if (startTime && endTime) {
    return `${startTime} – ${endTime}`;
  }
  return startTime ?? endTime ?? null;
}

function FunctionRow({
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
  const time = formatTimeRange(fn.startTime, fn.endTime);

  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{fn.name}</h3>
        <div className="resource-meta">
          {date && <span className="resource-tag">{date}</span>}
          {time && <span className="resource-tag">{time}</span>}
          {fn.venue && <span className="resource-tag">{fn.venue}</span>}
          <span className={`resource-tag ${statusTagClass[fn.status]}`}>{eventFunctionStatusLabel(fn.status)}</span>
        </div>
        {fn.description && <p>{fn.description}</p>}
      </div>

      {canManage && (
        <div className="resource-card-actions">
          <button type="button" className="btn-secondary" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-secondary" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The function/ceremony rows for `/events/:eventId/functions`. `functions`
 * is the full list for the event — no client-side filtering, unlike Guests.
 */
export function FunctionList({
  functions,
  canManage,
  onEdit,
  onDelete
}: {
  functions: readonly EventFunction[];
  canManage: boolean;
  onEdit: (fn: EventFunction) => void;
  onDelete: (fn: EventFunction) => void;
}): JSX.Element {
  if (functions.length === 0) {
    return (
      <div className="resource-empty">
        <p>No functions added yet.</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {functions.map((fn) => (
        <FunctionRow key={fn.id} fn={fn} canManage={canManage} onEdit={() => onEdit(fn)} onDelete={() => onDelete(fn)} />
      ))}
    </ul>
  );
}
