import { useState } from 'react';
import { invitationService } from '@/app/services';
import { EventInvitationSummary, EventPersonSummary, personRoleDisplayLabel } from '@/features/events/types/people';
import { eventMemberSideLabel, eventRoleLabel, invitationStatusLabel, membershipStatusLabel } from '@/lib/labels';
import { eventRoleBadgeVariant, invitationStatusBadgeVariant, membershipStatusBadgeVariant } from '@/lib/badgeVariants';
import { formatEventDate } from '@/lib/date';
import { EventRole } from '@/types/membership';
import { InvitationStatus } from '@/types/invitation';
import { InvitationError } from '@/lib/appError';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

function MemberRow({
  member,
  canManage,
  isSelf,
  onChangeRole,
  onRemove
}: {
  member: EventPersonSummary;
  canManage: boolean;
  isSelf: boolean;
  onChangeRole: (member: EventPersonSummary) => void;
  onRemove: (member: EventPersonSummary) => void;
}): JSX.Element {
  const roleLabel = personRoleDisplayLabel(member.role, member.side, eventRoleLabel, eventMemberSideLabel);
  const joined = formatEventDate(member.joinedAt);
  // The event owner can never be removed or reassigned (no ownership
  // transfer in this pass — see removeMember/updateMemberRole), and a
  // manager acting on their own row could lock themselves out mid-page,
  // so both actions are limited to other, non-owner members.
  const canActOnThisMember = canManage && !isSelf && member.role !== EventRole.Owner;

  return (
    <Card padded>
      <div className="person-row">
        <div className="person-row-primary">
          <h3>{member.label ?? 'Member'}</h3>
        </div>

        <div className="person-row-field">
          <span className="person-row-field-label">Role</span>
          <Badge variant={eventRoleBadgeVariant(member.role)}>{roleLabel}</Badge>
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
  invitation: EventInvitationSummary;
  canManage: boolean;
  onCancel: (invitation: EventInvitationSummary) => void;
}): JSX.Element {
  const roleLabel = personRoleDisplayLabel(invitation.role, invitation.side, eventRoleLabel, eventMemberSideLabel);
  const created = formatEventDate(invitation.createdAt);
  const expires = formatEventDate(invitation.expiresAt);
  const { show: showToast } = useToast();
  const [resending, setResending] = useState(false);

  const handleCopyLink = async (): Promise<void> => {
    const url = `${window.location.origin}/invitations/${invitation.id}`;
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
      await invitationService.resendInvitation(invitation.id);
      showToast(`Invitation extended for ${invitation.invitedEmail}.`, 'success');
    } catch (err) {
      showToast(
        err instanceof InvitationError ? err.friendlyMessage : "We couldn't resend this invitation right now.",
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
          <Badge variant={eventRoleBadgeVariant(invitation.role)}>{roleLabel}</Badge>
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

/**
 * The "Members" section for `/events/:eventId/people` — everyone with
 * active/resolved access to this event, including the current user's own
 * row. `members` is the already search-filtered list; `hasOtherMembers`
 * reflects the true (unfiltered) state, so a search with no matches reads
 * differently from a genuinely solo event.
 */
export function MembersList({
  members,
  hasOtherMembers,
  canInvite,
  currentUserId,
  onAddPerson,
  onChangeRole,
  onRemove
}: {
  members: readonly EventPersonSummary[];
  hasOtherMembers: boolean;
  canInvite: boolean;
  currentUserId: string | null;
  onAddPerson: () => void;
  onChangeRole: (member: EventPersonSummary) => void;
  onRemove: (member: EventPersonSummary) => void;
}): JSX.Element {
  if (!hasOtherMembers) {
    return (
      <EmptyState
        title="No collaborators yet"
        description="Invite planners, family, or staff to help manage this event."
        action={canInvite ? <Button onClick={onAddPerson}>+ Invite Person</Button> : undefined}
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
            canManage={canInvite}
            isSelf={member.userId === currentUserId}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * The "Pending Invitations" section for `/events/:eventId/people`.
 * `invitations` is the already search-filtered list; `hasAnyInvitations`
 * reflects the true (unfiltered) state.
 */
export function PendingInvitationsList({
  invitations,
  hasAnyInvitations,
  canManage,
  onCancel
}: {
  invitations: readonly EventInvitationSummary[];
  hasAnyInvitations: boolean;
  canManage: boolean;
  onCancel: (invitation: EventInvitationSummary) => void;
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
