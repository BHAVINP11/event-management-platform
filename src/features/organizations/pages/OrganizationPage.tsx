import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrganizationAccess } from '@/features/organizations/hooks/useOrganizationAccess';
import { useOrganizationPeople } from '@/features/organizations/hooks/useOrganizationPeople';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { organizationMemberManagementService, organizationInvitationService } from '@/app/services';
import { OrganizationSettingsForm } from '@/features/organizations/components/OrganizationSettingsForm';
import { OrganizationInviteForm } from '@/features/organizations/components/OrganizationInviteForm';
import { ChangeOrganizationMemberRoleForm } from '@/features/organizations/components/ChangeOrganizationMemberRoleForm';
import {
  OrganizationMembersList,
  OrganizationPendingInvitationsList
} from '@/features/organizations/components/OrganizationPeopleList';
import {
  OrganizationInvitationSummary,
  OrganizationPersonSummary
} from '@/features/organizations/types/organizationPeople';
import { MembershipStatus } from '@/types/membership';
import { OrganizationError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { eventStatusBadgeVariant } from '@/lib/badgeVariants';
import { eventStatusLabel, eventTypeLabel } from '@/lib/labels';
import { formatDateRange } from '@/lib/date';

function OrganizationNotice({ title, body }: { title: string; body: string }): JSX.Element {
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

function matchesMemberSearch(member: OrganizationPersonSummary, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  return Boolean(member.label?.toLowerCase().includes(search.trim().toLowerCase()));
}

function matchesInvitationSearch(invitation: OrganizationInvitationSummary, search: string): boolean {
  if (!search.trim()) {
    return true;
  }
  return invitation.invitedEmail.toLowerCase().includes(search.trim().toLowerCase());
}

/**
 * `/organizations/:organizationId` — organization details/settings and
 * member management, in one page switched by `Tabs` rather than two
 * separate routes (the task's own list of UI primitives to reuse
 * explicitly includes `Tabs`, and this keeps the route surface to the
 * minimum needed). "Organization events" reuses `useDashboardData`
 * directly — the exact same read the Dashboard already performs — rather
 * than a second event-listing query; it only surfaces events the
 * current viewer is personally an EventMember of (see the final report
 * for the known limitation this implies for a multi-admin organization).
 */
export function OrganizationPage(): JSX.Element {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const { state, reload } = useOrganizationAccess(user?.id ?? null, organizationId);
  const peopleState = useOrganizationPeople(user?.id ?? null, organizationId);
  const dashboardState = useDashboardData(user?.id ?? null);
  const { show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const [changingRoleFor, setChangingRoleFor] = useState<OrganizationPersonSummary | null>(null);
  const [removingMember, setRemovingMember] = useState<OrganizationPersonSummary | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<OrganizationInvitationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleRemoveConfirm = async (): Promise<void> => {
    if (!organizationId || !removingMember) {
      return;
    }
    setRemoveError(null);
    setRemoving(true);
    try {
      await organizationMemberManagementService.removeMember(organizationId, removingMember.userId);
      setRemovingMember(null);
      showToast(`${removingMember.label ?? 'Member'} was removed from this organization.`, 'success');
      peopleState.reload();
    } catch (err) {
      setRemoveError(err instanceof OrganizationError ? err.friendlyMessage : "We couldn't remove this member right now.");
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
      await organizationInvitationService.cancelInvitation(cancellingInvitation.id);
      setCancellingInvitation(null);
      showToast(`Invitation to ${cancellingInvitation.invitedEmail} was cancelled.`, 'success');
      peopleState.reload();
    } catch (err) {
      setCancelError(err instanceof OrganizationError ? err.friendlyMessage : "We couldn't cancel this invitation right now.");
    } finally {
      setCancelling(false);
    }
  };

  const peopleData = peopleState.state.status === 'allowed' ? peopleState.state.data : null;

  // `listPeople` still returns revoked (removed) members too — the page
  // filters down to who currently has access itself, mirroring
  // EventPeoplePage's identical reasoning.
  const activeMembers = useMemo(
    () => (peopleData ? peopleData.members.filter((member) => member.status === MembershipStatus.Active) : []),
    [peopleData]
  );

  const hasOtherMembers = useMemo(() => activeMembers.some((member) => member.label === null), [activeMembers]);

  const visibleMembers = useMemo(
    () => activeMembers.filter((member) => matchesMemberSearch(member, search)),
    [activeMembers, search]
  );

  const visibleInvitations = useMemo(
    () => (peopleData ? peopleData.invitations.filter((invitation) => matchesInvitationSearch(invitation, search)) : []),
    [peopleData, search]
  );

  const organizationEvents = useMemo(() => {
    if (dashboardState.state.status !== 'ready' || !organizationId) {
      return [];
    }
    return dashboardState.state.data.events.filter((event) => event.organizationId === organizationId);
  }, [dashboardState.state, organizationId]);

  if (state.status === 'loading') {
    return (
      <section className="organizations-page">
        <LoadingState label="Loading organization…" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="organizations-page">
        <ErrorState message={state.message} onRetry={reload} />
      </section>
    );
  }

  if (state.status === 'denied') {
    return (
      <OrganizationNotice
        title="You don't have access to this organization"
        body="Ask an organization owner or admin to invite you, then try again."
      />
    );
  }

  if (state.status === 'notFound') {
    return (
      <OrganizationNotice
        title="We couldn't find this organization"
        body="It may have been removed, or the link may be out of date."
      />
    );
  }

  const { organization } = state;

  return (
    <section className="organizations-page">
      <div className="people-header">
        <div>
          <h1>{organization.name}</h1>
          <p className="people-subtitle">Manage your organization&apos;s details and members.</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'members', label: 'Members' }
        ]}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as 'details' | 'members')}
        panelId="organization-tab-panel"
      />

      <div id="organization-tab-panel" style={{ marginTop: 'var(--space-6)' }}>
        {activeTab === 'details' && (
          <>
            <Card padded>
              {organization.canManage ? (
                <OrganizationSettingsForm organization={organization} onSaved={(message) => { showToast(message, 'success'); reload(); }} />
              ) : (
                <div>
                  <p>
                    <strong>Name:</strong> {organization.name}
                  </p>
                  <p>
                    <strong>Slug:</strong> {organization.slug}
                  </p>
                  {organization.description && (
                    <p>
                      <strong>Description:</strong> {organization.description}
                    </p>
                  )}
                  <p>
                    <strong>Contact email:</strong> {organization.contactEmail}
                  </p>
                  {organization.contactPhone && (
                    <p>
                      <strong>Contact phone:</strong> {organization.contactPhone}
                    </p>
                  )}
                </div>
              )}
            </Card>

            <div className="people-section">
              <div className="people-section-header">
                <h2>Events</h2>
                {organization.canManage && (
                  <Link to="/events/new">
                    <Button variant="secondary" size="sm">
                      + Create Event
                    </Button>
                  </Link>
                )}
              </div>

              {dashboardState.state.status === 'loading' && <LoadingState label="Loading events…" />}
              {dashboardState.state.status === 'error' && (
                <ErrorState message={dashboardState.state.message} onRetry={dashboardState.reload} />
              )}
              {dashboardState.state.status === 'ready' && organizationEvents.length === 0 && (
                <EmptyState
                  title="No events yet"
                  description="Events created for this organization will appear here."
                />
              )}
              {dashboardState.state.status === 'ready' && organizationEvents.length > 0 && (
                <ul className="people-list">
                  {organizationEvents.map((event) => (
                    <li key={event.id}>
                      <Link to={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Card interactive padded>
                          <div className="person-row">
                            <div className="person-row-primary">
                              <h3>{event.name}</h3>
                            </div>
                            <div className="person-row-field">
                              <span className="person-row-field-label">Type</span>
                              <span>{eventTypeLabel(event.type)}</span>
                            </div>
                            <div className="person-row-field">
                              <span className="person-row-field-label">Status</span>
                              <Badge variant={eventStatusBadgeVariant(event.status)}>{eventStatusLabel(event.status)}</Badge>
                            </div>
                            <div className="person-row-field">
                              <span className="person-row-field-label">Dates</span>
                              <span>{formatDateRange(event.startDate, event.endDate) ?? '—'}</span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {activeTab === 'members' && (
          <>
            {peopleState.state.status === 'loading' && <LoadingState label="Loading members…" />}
            {peopleState.state.status === 'error' && (
              <ErrorState message={peopleState.state.message} onRetry={peopleState.reload} />
            )}

            {peopleData && (
              <>
                <div className="people-header">
                  <div />
                  {peopleData.canManage && <Button onClick={() => setInviting(true)}>+ Invite Person</Button>}
                </div>

                {(peopleData.members.length > 1 || peopleData.invitations.length > 0) && (
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
                  <OrganizationMembersList
                    members={visibleMembers}
                    hasOtherMembers={hasOtherMembers}
                    canManage={peopleData.canManage}
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
                  <OrganizationPendingInvitationsList
                    invitations={visibleInvitations}
                    hasAnyInvitations={peopleData.invitations.length > 0}
                    canManage={peopleData.canManage}
                    onCancel={setCancellingInvitation}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {organizationId && inviting && (
        <Modal open onClose={() => setInviting(false)} title="Invite Person">
          <OrganizationInviteForm
            organizationId={organizationId}
            onInvited={(message) => {
              setInviting(false);
              showToast(message, 'success');
              peopleState.reload();
            }}
            onCancel={() => setInviting(false)}
          />
        </Modal>
      )}

      {organizationId && changingRoleFor && (
        <Modal open onClose={() => setChangingRoleFor(null)} title="Change role">
          <ChangeOrganizationMemberRoleForm
            organizationId={organizationId}
            member={changingRoleFor}
            onSaved={(message) => {
              setChangingRoleFor(null);
              showToast(message, 'success');
              peopleState.reload();
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
            Remove {removingMember.label ?? 'this member'} from this organization? They will immediately lose
            access, but this can be undone by inviting them again. Their event memberships and any events they
            created are not affected.
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
    </section>
  );
}
