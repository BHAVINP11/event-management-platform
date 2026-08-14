import { EventInvitationSummary, EventPersonSummary, personRoleDisplayLabel } from '@/features/events/types/people';
import { eventMemberSideLabel, eventRoleLabel, invitationStatusLabel, membershipStatusLabel } from '@/lib/labels';

function MemberRow({ member }: { member: EventPersonSummary }): JSX.Element {
  const roleLabel = personRoleDisplayLabel(member.role, member.side, eventRoleLabel, eventMemberSideLabel);

  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{member.label ?? 'Member'}</h3>
        <div className="resource-meta">
          <span className="resource-tag">{roleLabel}</span>
          <span className={`resource-tag status-${member.status}`}>{membershipStatusLabel(member.status)}</span>
        </div>
      </div>
    </li>
  );
}

function InvitationRow({ invitation }: { invitation: EventInvitationSummary }): JSX.Element {
  const roleLabel = personRoleDisplayLabel(invitation.role, invitation.side, eventRoleLabel, eventMemberSideLabel);

  return (
    <li className="resource-card">
      <div className="resource-card-body">
        <h3>{invitation.invitedEmail}</h3>
        <div className="resource-meta">
          <span className="resource-tag">{roleLabel}</span>
          <span className="resource-tag status-draft">{invitationStatusLabel(invitation.status)}</span>
        </div>
      </div>
    </li>
  );
}

/**
 * A single flat list — accepted members first, then still-pending
 * invitations — matching how the page reads: everyone with access, and
 * who's still waiting.
 */
export function PeopleList({
  members,
  invitations
}: {
  members: readonly EventPersonSummary[];
  invitations: readonly EventInvitationSummary[];
}): JSX.Element {
  if (members.length === 0 && invitations.length === 0) {
    return (
      <div className="resource-empty">
        <p>No one has been added to this event yet.</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {members.map((member) => (
        <MemberRow key={member.id} member={member} />
      ))}
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  );
}
