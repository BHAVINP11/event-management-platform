import { FormEvent, useState } from 'react';
import { organizationMemberManagementService } from '@/app/services';
import { OrganizationPersonSummary, INVITABLE_ORGANIZATION_ROLES } from '@/features/organizations/types/organizationPeople';
import { OrganizationRole } from '@/types/membership';
import { organizationRoleLabel } from '@/lib/labels';
import { OrganizationError } from '@/lib/appError';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const ROLE_OPTIONS = INVITABLE_ORGANIZATION_ROLES.map((role) => ({ value: role, label: organizationRoleLabel(role) }));

/**
 * Change-role form for an organization member — the content of the
 * Modal `OrganizationMembersList` opens for a member row. Only mounted
 * for users with `canManage` (owner/admin) — `updateOrganizationMemberRole`
 * independently re-verifies the role server-side regardless, and also
 * independently refuses to touch the organization owner.
 */
export function ChangeOrganizationMemberRoleForm({
  organizationId,
  member,
  onSaved,
  onCancel
}: {
  organizationId: string;
  member: OrganizationPersonSummary;
  onSaved: (message: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [role, setRole] = useState<OrganizationRole>(
    INVITABLE_ORGANIZATION_ROLES.includes(member.role) ? member.role : OrganizationRole.Staff
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await organizationMemberManagementService.updateMemberRole(organizationId, member.userId, role);
      onSaved(`${member.label ?? 'Member'}'s role was updated.`);
    } catch (err) {
      setError(err instanceof OrganizationError ? err.friendlyMessage : "We couldn't update this member's role right now.");
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

      <Select
        label="Role *"
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as OrganizationRole)}
        disabled={submitting}
        options={ROLE_OPTIONS}
      />

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
