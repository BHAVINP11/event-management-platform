import { FormEvent, useState } from 'react';
import { invitationService } from '@/app/services';
import { InviteRoleOption, resolveInviteRole } from '@/features/events/types/people';
import { EventMemberSide } from '@/types/membership';
import { InvitationError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const ROLE_OPTIONS: { value: InviteRoleOption; label: string }[] = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'family', label: 'Family' },
  { value: 'planner', label: 'Planner' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' }
];

const SIDE_OPTIONS: { value: EventMemberSide | ''; label: string }[] = [
  { value: '', label: 'Not specified' },
  { value: EventMemberSide.Bride, label: "Bride's side" },
  { value: EventMemberSide.Groom, label: "Groom's side" }
];

/**
 * Invite-person form — the content of the Modal that hosts it. The role
 * dropdown speaks in guest-facing terms (Bride/Groom/Family/...);
 * `resolveInviteRole` maps the choice to the EventRole + side the backend
 * actually stores. Side is only asked for Family — Bride/Groom already
 * imply it, and Planner/Staff/Viewer never have one. Only mounted for
 * users with `canInvite` (owner/planner) — createInvitation independently
 * re-verifies the role server-side regardless.
 */
export function InviteForm({
  eventId,
  onInvited,
  onCancel
}: {
  eventId: string;
  onInvited: (message: string) => void;
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
      onInvited(`Invitation sent to ${invitedEmail}.`);
    } catch (err) {
      setError(err instanceof InvitationError ? err.friendlyMessage : "We couldn't send this invitation right now.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <Input
        label="Email *"
        name="invitedEmail"
        type="email"
        placeholder="name@example.com"
        value={invitedEmail}
        onChange={(event) => setInvitedEmail(event.target.value)}
        required
        disabled={submitting}
      />

      <div className="auth-form-row" style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Invite As *"
          name="roleOption"
          value={roleOption}
          onChange={(event) => setRoleOption(event.target.value as InviteRoleOption)}
          disabled={submitting}
          options={ROLE_OPTIONS}
        />
        {roleOption === 'family' && (
          <Select
            label="Side"
            name="familySide"
            value={familySide}
            onChange={(event) => setFamilySide(event.target.value as EventMemberSide | '')}
            disabled={submitting}
            options={SIDE_OPTIONS}
          />
        )}
      </div>

      <div className="auth-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
}
