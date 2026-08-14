import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFunctionList } from '@/features/events/hooks/useFunctionList';
import { FunctionForm } from '@/features/events/components/FunctionForm';
import { FunctionList } from '@/features/events/components/FunctionList';
import { functionService } from '@/app/services';
import { EventFunction } from '@/types/eventFunction';
import { FunctionError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resourceStyles } from '@/components/ui/resourceStyles';

type FormMode = 'closed' | 'add' | EventFunction;

function FunctionsNotice({ title, body }: { title: string; body: string }): JSX.Element {
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
 * `/events/:eventId/functions` — the event's functions/ceremonies list.
 * Same access check as the workspace Overview; Add/Edit/Delete are
 * additionally gated by `canManage` (owner/planner), enforced for real by
 * the createFunction/updateFunction/deleteFunction Cloud Functions
 * regardless of what this page shows.
 */
export function FunctionsPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useFunctionList(user?.id ?? null, eventId);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (fn: EventFunction): Promise<void> => {
    if (!window.confirm(`Remove ${fn.name} from this event?`)) {
      return;
    }

    setActionError(null);
    try {
      await functionService.deleteFunction(fn.id);
      reload();
    } catch (err) {
      setActionError(
        err instanceof FunctionError ? err.friendlyMessage : "We couldn't remove this function right now."
      );
    }
  };

  return (
    <section className="resource-page">
      {state.status === 'loading' && <LoadingSkeleton cards={2} />}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}

      {state.status === 'denied' && (
        <FunctionsNotice
          title="You don't have access to this event"
          body="Ask the event owner to invite you, then try again."
        />
      )}

      {state.status === 'notFound' && (
        <FunctionsNotice
          title="We couldn't find this event"
          body="It may have been removed, or the link may be out of date."
        />
      )}

      {state.status === 'allowed' && eventId && (
        <>
          <div className="resource-section-header">
            <h1>Functions</h1>
            {state.data.canManage && formMode === 'closed' && (
              <button type="button" className="btn-primary" onClick={() => setFormMode('add')}>
                + Add Function
              </button>
            )}
          </div>

          {formMode !== 'closed' && (
            <FunctionForm
              eventId={eventId}
              fn={formMode === 'add' ? undefined : formMode}
              onSaved={() => {
                setFormMode('closed');
                reload();
              }}
              onCancel={() => setFormMode('closed')}
            />
          )}

          {actionError && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              {actionError}
            </div>
          )}

          <FunctionList
            functions={state.data.functions}
            canManage={state.data.canManage}
            onEdit={(fn) => setFormMode(fn)}
            onDelete={handleDelete}
          />
        </>
      )}

      <style>{resourceStyles}</style>
    </section>
  );
}
