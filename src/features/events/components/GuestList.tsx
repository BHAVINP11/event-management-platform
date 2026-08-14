import { Guest } from '@/types/guest';
import { guestSideLabel, guestStatusLabel } from '@/lib/labels';

const statusTagClass: Record<Guest['status'], string> = {
  pending: 'status-draft',
  invited: 'status-draft',
  confirmed: 'status-active',
  declined: 'status-archived'
};

function GuestRow({
  guest,
  canManage,
  onEdit,
  onDelete
}: {
  guest: Guest;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{guest.name}</h3>
        {guest.phone && <p>{guest.phone}</p>}
        <div className="resource-meta">
          <span className="resource-tag">{guestSideLabel(guest.side)}</span>
          {guest.relation && <span className="resource-tag">{guest.relation}</span>}
          <span className={`resource-tag ${statusTagClass[guest.status]}`}>{guestStatusLabel(guest.status)}</span>
        </div>
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
 * The guest rows for `/events/:eventId/guests`. `guests` is the already
 * filtered/searched list; `hasAnyGuests` distinguishes "no guests on this
 * event yet" from "no guests match the current filter/search," which need
 * different empty-state copy.
 */
export function GuestList({
  guests,
  hasAnyGuests,
  canManage,
  onEdit,
  onDelete
}: {
  guests: readonly Guest[];
  hasAnyGuests: boolean;
  canManage: boolean;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}): JSX.Element {
  if (guests.length === 0) {
    return (
      <div className="resource-empty">
        <p>{hasAnyGuests ? 'No guests match your search.' : 'No guests added yet.'}</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {guests.map((guest) => (
        <GuestRow
          key={guest.id}
          guest={guest}
          canManage={canManage}
          onEdit={() => onEdit(guest)}
          onDelete={() => onDelete(guest)}
        />
      ))}
    </ul>
  );
}
