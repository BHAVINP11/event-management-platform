import { FormEvent, useState } from 'react';
import { invitationService } from '@/app/services';
import { InviteRoleOption, resolveInviteRole } from '@/features/events/types/people';
import { EventMemberSide } from '@/types/membership';
import { InvitationError } from '@/lib/appError';

const ROLE_OPTIONS: { value: InviteRoleOption; label: string }[] = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'family', label: 'Family' },
  { value: 'planner', label: 'Planner' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' }
];

/**
 * Invite-person form. The role dropdown speaks in guest-facing terms
 * (Bride/Groom/Family/...); `resolveInviteRole` maps the choice to the
 * EventRole + side the backend actually stores. Side is only asked for
 * Family — Bride/Groom already imply it, and Planner/Staff/Viewer never
 * have one.
 */
export function InviteForm({
  eventId,
  onInvited,
  onCancel
}: {
  eventId: string;
  onInvited: () => void;
  onCancel: () => void;
}): JSX.Element {
  const [invitedEmail, setInvitedEmail] = useState('');
  const [roleOption, setRoleOption] = useState<InviteRoleOption>('family');
  const [familySide, setFamilySide] = useState<EventMemberSide | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input = resolveInviteRole({
        invitedEmail,
        roleOption,
        familySide: familySide || undefined
      });
      await invitationService.createInvitation(eventId, input);
      onInvited();
    } catch (err) {
      setError(err instanceof InvitationError ? err.friendlyMessage : "We couldn't send this invitation right now.");
      setSubmitting(false);
    }
  };

  return (
    <form className="event-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="invite-email">Email *</label>
        <input
          id="invite-email"
          type="email"
          placeholder="name@example.com"
          value={invitedEmail}
          onChange={(event) => setInvitedEmail(event.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="invite-role">Invite as *</label>
        <select
          id="invite-role"
          value={roleOption}
          onChange={(event) => setRoleOption(event.target.value as InviteRoleOption)}
          disabled={submitting}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {roleOption === 'family' && (
        <div className="form-group">
          <label htmlFor="invite-side">Side</label>
          <select
            id="invite-side"
            value={familySide}
            onChange={(event) => setFamilySide(event.target.value as EventMemberSide | '')}
            disabled={submitting}
          >
            <option value="">Not specified</option>
            <option value={EventMemberSide.Bride}>Bride&apos;s side</option>
            <option value={EventMemberSide.Groom}>Groom&apos;s side</option>
          </select>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
}
