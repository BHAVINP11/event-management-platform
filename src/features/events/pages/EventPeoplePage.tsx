import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEventPeople } from '@/features/events/hooks/useEventPeople';
import { InviteForm } from '@/features/events/components/InviteForm';
import { PeopleList } from '@/features/events/components/PeopleList';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

function PeopleNotice({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="resource-notice">
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/dashboard" className="btn-secondary">
        Back to dashboard
      </Link>
    </div>
  );
}

/**
 * `/events/:eventId/people` — who has access to this event, and who's still
 * pending. Uses the same access check as the workspace Overview; inviting is
 * additionally gated by `canInvite` (owner/planner), enforced for real by
 * the createInvitation Cloud Function regardless of what this page shows.
 */
export function EventPeoplePage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useEventPeople(user?.id ?? null, eventId);
  const [showInviteForm, setShowInviteForm] = useState(false);

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={2} />}

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

      {state.status === 'allowed' && (
        <>
          <div className="resource-section-header">
            <h1>People</h1>
            {state.data.canInvite && !showInviteForm && (
              <button type="button" className="btn-primary" onClick={() => setShowInviteForm(true)}>
                + Invite Person
              </button>
            )}
          </div>

          {showInviteForm && eventId && (
            <InviteForm
              eventId={eventId}
              onInvited={() => {
                setShowInviteForm(false);
                reload();
              }}
              onCancel={() => setShowInviteForm(false)}
            />
          )}

          <PeopleList members={state.data.members} invitations={state.data.invitations} />
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
