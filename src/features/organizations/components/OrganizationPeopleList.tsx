import { useState } from 'react';
import { organizationInvitationService } from '@/app/services';
import {
  OrganizationInvitationSummary,
  OrganizationPersonSummary
} from '@/features/organizations/types/organizationPeople';
import { organizationRoleLabel, invitationStatusLabel, membershipStatusLabel } from '@/lib/labels';
import { organizationRoleBadgeVariant, invitationStatusBadgeVariant, membershipStatusBadgeVariant } from '@/lib/badgeVariants';
import { formatEventDate } from '@/lib/date';
import { OrganizationRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import { OrganizationError } from '@/lib/appError';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

/**
 * The Organization Members page and its list components. Reuses the same
 * `people-list`/`person-row`/`invitation-row` layout classes the event
 * People page already established (`src/styles/people.css`) — these are
 * generic row-list styles, not event-specific, so introducing a
 * parallel set of CSS classes for organizations would be pure
 * duplication rather than a genuine visual difference.
 */

function MemberRow({
  member,
  canManage,
  isSelf,
  onChangeRole,
  onRemove
}: {
  member: OrganizationPersonSummary;
  canManage: boolean;
  isSelf: boolean;
  onChangeRole: (member: OrganizationPersonSummary) => void;
  onRemove: (member: OrganizationPersonSummary) => void;
}): JSX.Element {
  const joined = formatEventDate(member.joinedAt);
  // The organization owner can never be removed or reassigned (no
  // ownership transfer in this pass — see removeOrganizationMember/
  // updateOrganizationMemberRole), and a manager acting on their own row
  // could lock themselves out mid-page, so both actions are limited to
  // other, non-owner members.
  const canActOnThisMember = canManage && !isSelf && member.role !== OrganizationRole.Owner;

  return (
    <Card padded>
      <div className="person-row">
        <div className="person-row-primary">
          <h3>{member.label ?? 'Member'}</h3>
        </div>

        <div className="person-row-field">
          <span className="person-row-field-label">Role</span>
          <Badge variant={organizationRoleBadgeVariant(member.role)}>{organizationRoleLabel(member.role)}</Badge>
        </div>

        <div className="person-row-field">
          <span className="person-row-field-label">Status</span>
          <Badge variant={membershipStatusBadgeVariant(member.status)}>{membershipStatusLabel(member.status)}</Badge>
        </div>

        <div className="person-row-field">
          <span className="person-row-field-label">Joined</span>
          <span>{joined ?? '—'}</span>
        </div>

        {canActOnThisMember && (
          <div className="person-row-actions">
            <Button variant="secondary" size="sm" onClick={() => onChangeRole(member)}>
              Change role
            </Button>
            <Button variant="danger" size="sm" onClick={() => onRemove(member)}>
              Remove
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function InvitationRow({
  invitation,
  canManage,
  onCancel
}: {
  invitation: OrganizationInvitationSummary;
  canManage: boolean;
  onCancel: (invitation: OrganizationInvitationSummary) => void;
}): JSX.Element {
  const created = formatEventDate(invitation.createdAt);
  const expires = formatEventDate(invitation.expiresAt);
  const { show: showToast } = useToast();
  const [resending, setResending] = useState(false);

  const handleCopyLink = async (): Promise<void> => {
    const url = `${window.location.origin}/organization-invitations/${invitation.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Invitation link copied.', 'success');
    } catch {
      showToast("We couldn't copy the link. Please try again.", 'danger');
    }
  };

  const handleResend = async (): Promise<void> => {
    setResending(true);
    try {
      await organizationInvitationService.resendInvitation(invitation.id);
      showToast(`Invitation extended for ${invitation.invitedEmail}.`, 'success');
    } catch (err) {
      showToast(
        err instanceof OrganizationError ? err.friendlyMessage : "We couldn't resend this invitation right now.",
        'danger'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <Card padded>
      <div className="invitation-row">
        <div className="invitation-row-primary">
          <h3>{invitation.invitedEmail}</h3>
        </div>

        <div className="invitation-row-field">
          <span className="invitation-row-field-label">Role</span>
          <Badge variant={organizationRoleBadgeVariant(invitation.role)}>{organizationRoleLabel(invitation.role)}</Badge>
        </div>

        <div className="invitation-row-field">
          <span className="invitation-row-field-label">Status</span>
          <Badge variant={invitationStatusBadgeVariant(invitation.status)}>
            {invitationStatusLabel(invitation.status)}
          </Badge>
        </div>

        <div className="invitation-row-field invitation-row-field--sent">
          <span className="invitation-row-field-label">Sent</span>
          <span>{created ?? '—'}</span>
        </div>

        <div className="invitation-row-field invitation-row-field--expires">
          <span className="invitation-row-field-label">Expires</span>
          <span>{expires ?? '—'}</span>
        </div>

        {canManage && invitation.status === InvitationStatus.Pending && (
          <div className="invitation-row-actions">
            <Button variant="secondary" size="sm" onClick={() => void handleCopyLink()}>
              Copy link
            </Button>
            <Button variant="secondary" size="sm" disabled={resending} onClick={() => void handleResend()}>
              {resending ? 'Resending…' : 'Resend'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => onCancel(invitation)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function OrganizationMembersList({
  members,
  hasOtherMembers,
  canManage,
  currentUserId,
  onAddPerson,
  onChangeRole,
  onRemove
}: {
  members: readonly OrganizationPersonSummary[];
  hasOtherMembers: boolean;
  canManage: boolean;
  currentUserId: string | null;
  onAddPerson: () => void;
  onChangeRole: (member: OrganizationPersonSummary) => void;
  onRemove: (member: OrganizationPersonSummary) => void;
}): JSX.Element {
  if (!hasOtherMembers) {
    return (
      <EmptyState
        title="No collaborators yet"
        description="Invite admins, planners, or staff to help manage this organization."
        action={canManage ? <Button onClick={onAddPerson}>+ Invite Person</Button> : undefined}
      />
    );
  }

  if (members.length === 0) {
    return <EmptyState title="No collaborators match your search" description="Try a different name." />;
  }

  return (
    <ul className="people-list">
      {members.map((member) => (
        <li key={member.id}>
          <MemberRow
            member={member}
            canManage={canManage}
            isSelf={member.userId === currentUserId}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
          />
        </li>
      ))}
    </ul>
  );
}

export function OrganizationPendingInvitationsList({
  invitations,
  hasAnyInvitations,
  canManage,
  onCancel
}: {
  invitations: readonly OrganizationInvitationSummary[];
  hasAnyInvitations: boolean;
  canManage: boolean;
  onCancel: (invitation: OrganizationInvitationSummary) => void;
}): JSX.Element {
  if (!hasAnyInvitations) {
    return <EmptyState title="All invitations are up to date." />;
  }

  if (invitations.length === 0) {
    return <EmptyState title="No invitations match your search" description="Try a different email." />;
  }

  return (
    <ul className="people-list">
      {invitations.map((invitation) => (
        <li key={invitation.id}>
          <InvitationRow invitation={invitation} canManage={canManage} onCancel={onCancel} />
        </li>
      ))}
    </ul>
  );
}
