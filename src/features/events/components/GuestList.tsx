import { Guest } from '@/types/guest';
import { guestSideLabel, guestStatusLabel } from '@/lib/labels';
import { guestStatusBadgeVariant } from '@/lib/badgeVariants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

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
    <Card padded>
      <div className="guest-row">
        <div className="guest-row-primary">
          <h3>{guest.name}</h3>
          {(guest.phone || guest.email) && <p>{[guest.phone, guest.email].filter(Boolean).join(' · ')}</p>}
        </div>

        <div className="guest-row-field">
          <span className="guest-row-field-label">Side</span>
          <Badge variant="neutral">{guestSideLabel(guest.side)}</Badge>
        </div>

        <div className="guest-row-field guest-row-field--relation">
          <span className="guest-row-field-label">Relation</span>
          <span>{guest.relation ?? '—'}</span>
        </div>

        <div className="guest-row-field">
          <span className="guest-row-field-label">Status</span>
          <Badge variant={guestStatusBadgeVariant(guest.status)}>{guestStatusLabel(guest.status)}</Badge>
        </div>

        {canManage && (
          <div className="guest-row-actions">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </Card>
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
  onAdd,
  onEdit,
  onDelete
}: {
  guests: readonly Guest[];
  hasAnyGuests: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}): JSX.Element {
  if (guests.length === 0) {
    return (
      <EmptyState
        title={hasAnyGuests ? 'No guests match your search' : 'No guests added yet'}
        description={
          hasAnyGuests ? 'Try a different name, phone, or filter.' : 'Start building your guest list.'
        }
        action={canManage && !hasAnyGuests ? <Button onClick={onAdd}>+ Add Guest</Button> : undefined}
      />
    );
  }

  return (
    <ul className="guests-list">
      {guests.map((guest) => (
        <li key={guest.id}>
          <GuestRow guest={guest} canManage={canManage} onEdit={() => onEdit(guest)} onDelete={() => onDelete(guest)} />
        </li>
      ))}
    </ul>
  );
}
