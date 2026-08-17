import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventPeople } from '@/features/events/hooks/useEventPeople';
import { memberManagementService, invitationService } from '@/app/services';
import { InviteForm } from '@/features/events/components/InviteForm';
import { ChangeMemberRoleForm } from '@/features/events/components/ChangeMemberRoleForm';
import { MembersList, PendingInvitationsList } from '@/features/events/components/PeopleList';
import { EventInvitationSummary, EventPersonSummary } from '@/features/events/types/people';
import { MembershipStatus } from '@/types/membership';
import { MemberError, InvitationError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

function PeopleNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <EmptyState
      title={title}
      description={body}
      action={
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

function matchesMemberSearch(member: EventPersonSummary, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  return Boolean(member.label?.toLowerCase().includes(search.trim().toLowerCase()));
}

function matchesInvitationSearch(invitation: EventInvitationSummary, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  return invitation.invitedEmail.toLowerCase().includes(search.trim().toLowerCase());
}

/**
 * `/events/:eventId/people` — who has access to this event, and who's
 * still pending. Uses the same access check as the workspace Overview;
 * inviting, removing a member, changing a member's role, and cancelling/
 * resending an invitation are all gated by `canInvite` (owner/planner) —
 * enforced for real by the createInvitation/removeMember/
 * updateMemberRole/cancelInvitation/resendInvitation Cloud Functions
 * regardless of what this page shows. "Resend" extends the same
 * invitation's expiry rather than sending a new email — there is no
 * email-sending infrastructure in this app — so "Copy link" exists
 * alongside it as the actual way an owner/planner shares the invitation.
 * Search runs client-side over the already-loaded list — no new queries.
 */
export function EventPeoplePage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useEventPeople(user?.id ?? null, eventId);
  const { show: showToast } = useToast();

  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const [changingRoleFor, setChangingRoleFor] = useState<EventPersonSummary | null>(null);
  const [removingMember, setRemovingMember] = useState<EventPersonSummary | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<EventInvitationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleRemoveConfirm = async (): Promise<void> => {
    if (!eventId || !removingMember) {
      return;
    }
    setRemoveError(null);
    setRemoving(true);
    try {
      await memberManagementService.removeMember(eventId, removingMember.userId);
      setRemovingMember(null);
      showToast(`${removingMember.label ?? 'Member'} was removed from this event.`, 'success');
      reload();
    } catch (err) {
      setRemoveError(err instanceof MemberError ? err.friendlyMessage : "We couldn't remove this member right now.");
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelInvitationConfirm = async (): Promise<void> => {
    if (!cancellingInvitation) {
      return;
    }
    setCancelError(null);
    setCancelling(true);
    try {
      await invitationService.cancelInvitation(cancellingInvitation.id);
      setCancellingInvitation(null);
      showToast(`Invitation to ${cancellingInvitation.invitedEmail} was cancelled.`, 'success');
      reload();
    } catch (err) {
      setCancelError(err instanceof InvitationError ? err.friendlyMessage : "We couldn't cancel this invitation right now.");
    } finally {
      setCancelling(false);
    }
  };

  // `listPeople` still returns revoked (removed) members too — other
  // consumers (e.g. TaskService) need every member present to resolve a
  // historical assignee's label — so the People page filters down to who
  // currently has access itself, rather than the shared data load.
  const activeMembers = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return state.data.members.filter((member) => member.status === MembershipStatus.Active);
  }, [state]);

  const hasOtherMembers = useMemo(
    () => activeMembers.some((member) => member.label === null),
    [activeMembers]
  );

  const visibleMembers = useMemo(
    () => activeMembers.filter((member) => matchesMemberSearch(member, search)),
    [activeMembers, search]
  );

  const visibleInvitations = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return state.data.invitations.filter((invitation) => matchesInvitationSearch(invitation, search));
  }, [state, search]);

  return (
    <section className="people-page">
      {state.status === 'loading' && <LoadingState label="Loading people…" />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'denied' && (
        <PeopleNotice
          title="You don't have access to this event"
          body="Ask the event owner to invite you, then try again."
        />
      )}

      {state.status === 'notFound' && (
        <PeopleNotice
          title="We couldn't find this event"
          body="It may have been removed, or the link may be out of date."
        />
      )}

      {state.status === 'allowed' && eventId && (
        <>
          <div className="people-header">
            <div>
              <h1>People</h1>
              <p className="people-subtitle">Manage who can collaborate on this event.</p>
            </div>
            {state.data.canInvite && <Button onClick={() => setInviting(true)}>+ Invite Person</Button>}
          </div>

          {(state.data.members.length > 1 || state.data.invitations.length > 0) && (
            <div className="people-search">
              <Input
                label="Search"
                placeholder="Search by name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          )}

          <div className="people-section">
            <div className="people-section-header">
              <h2>Members</h2>
            </div>
            <MembersList
              members={visibleMembers}
              hasOtherMembers={hasOtherMembers}
              canInvite={state.data.canInvite}
              currentUserId={user?.id ?? null}
              onAddPerson={() => setInviting(true)}
              onChangeRole={setChangingRoleFor}
              onRemove={setRemovingMember}
            />
          </div>

          <div className="people-section">
            <div className="people-section-header">
              <h2>Pending Invitations</h2>
            </div>
            <PendingInvitationsList
              invitations={visibleInvitations}
              hasAnyInvitations={state.data.invitations.length > 0}
              canManage={state.data.canInvite}
              onCancel={setCancellingInvitation}
            />
          </div>

          {inviting && (
            <Modal open onClose={() => setInviting(false)} title="Invite Person">
              <InviteForm
                eventId={eventId}
                onInvited={(message) => {
                  setInviting(false);
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setInviting(false)}
              />
            </Modal>
          )}

          {changingRoleFor && (
            <Modal open onClose={() => setChangingRoleFor(null)} title="Change role">
              <ChangeMemberRoleForm
                eventId={eventId}
                member={changingRoleFor}
                onSaved={(message) => {
                  setChangingRoleFor(null);
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setChangingRoleFor(null)}
              />
            </Modal>
          )}

          {removingMember && (
            <Modal open onClose={() => setRemovingMember(null)} title="Remove member?">
              {removeError && (
                <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                  {removeError}
                </div>
              )}
              <p>
                Remove {removingMember.label ?? 'this member'} from this event? They will immediately lose access,
                but this can be undone by inviting them again.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setRemovingMember(null)} disabled={removing}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void handleRemoveConfirm()} disabled={removing}>
                  {removing ? 'Removing…' : 'Remove member'}
                </Button>
              </div>
            </Modal>
          )}

          {cancellingInvitation && (
            <Modal open onClose={() => setCancellingInvitation(null)} title="Cancel invitation?">
              {cancelError && (
                <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                  {cancelError}
                </div>
              )}
              <p>
                Cancel the invitation sent to {cancellingInvitation.invitedEmail}? They will no longer be able to
                accept it.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setCancellingInvitation(null)} disabled={cancelling}>
                  Keep invitation
                </Button>
                <Button variant="danger" onClick={() => void handleCancelInvitationConfirm()} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel invitation'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
