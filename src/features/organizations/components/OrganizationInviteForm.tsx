import { FormEvent, useState } from 'react';
import { organizationInvitationService } from '@/app/services';
import { INVITABLE_ORGANIZATION_ROLES } from '@/features/organizations/types/organizationPeople';
import { OrganizationRole } from '@/types/membership';
import { organizationRoleLabel } from '@/lib/labels';
import { OrganizationError } from '@/lib/appError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const ROLE_OPTIONS = INVITABLE_ORGANIZATION_ROLES.map((role) => ({ value: role, label: organizationRoleLabel(role) }));

/**
 * Invite-person form for an organization — the content of the Modal that
 * hosts it. Unlike `InviteForm` (event invitations), there is no side
 * concept for organization roles, so this is a simpler form: email +
 * role only. Only mounted for users with `canManage` (owner/admin) —
 * `createOrganizationInvitation` independently re-verifies the role
 * server-side regardless.
 */
export function OrganizationInviteForm({
  organizationId,
  onInvited,
  onCancel
}: {
  organizationId: string;
  onInvited: (message: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [invitedEmail, setInvitedEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.Planner);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await organizationInvitationService.createInvitation(organizationId, { invitedEmail, role });
      onInvited(`Invitation sent to ${invitedEmail}.`);
    } catch (err) {
      setError(err instanceof OrganizationError ? err.friendlyMessage : "We couldn't send this invitation right now.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
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

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Select
          label="Invite As *"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as OrganizationRole)}
          disabled={submitting}
          options={ROLE_OPTIONS}
        />
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
