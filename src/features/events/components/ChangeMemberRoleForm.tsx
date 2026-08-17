import { FormEvent, useState } from 'react';
import { memberManagementService } from '@/app/services';
import {
  EventPersonSummary,
  InviteRoleOption,
  roleOptionToRoleSide,
  roleSideToRoleOption
} from '@/features/events/types/people';
import { EventMemberSide } from '@/types/membership';
import { MemberError } from '@/lib/appError';
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
 * Change-role form — the content of the Modal `PeopleList` opens for a
 * member row. Speaks the same Bride/Groom/Family/... vocabulary as
 * `InviteForm` (`roleOptionToRoleSide` is the exact mapping it uses), so
 * a member changed to "Bride" here is indistinguishable from one invited
 * as "Bride". Only mounted for users with `canManage` (owner/planner) —
 * `updateMemberRole` independently re-verifies the role server-side
 * regardless, and also independently refuses to touch the event owner.
 */
export function ChangeMemberRoleForm({
  eventId,
  member,
  onSaved,
  onCancel
}: {
  eventId: string;
  member: EventPersonSummary;
  onSaved: (message: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [roleOption, setRoleOption] = useState<InviteRoleOption>(roleSideToRoleOption(member.role, member.side));
  const [familySide, setFamilySide] = useState<EventMemberSide | ''>(member.side ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { role, side } = roleOptionToRoleSide(roleOption, familySide || undefined);
      await memberManagementService.updateMemberRole(eventId, member.userId, role, side);
      onSaved(`${member.label ?? 'Member'}'s role was updated.`);
    } catch (err) {
      setError(err instanceof MemberError ? err.friendlyMessage : "We couldn't update this member's role right now.");
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

      <div className="auth-form-row">
        <Select
          label="Role *"
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
          {submitting ? 'Saving…' : 'Save role'}
        </Button>
      </div>
    </form>
  );
}
