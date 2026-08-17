import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFunctionList } from '@/features/events/hooks/useFunctionList';
import { FunctionForm } from '@/features/events/components/FunctionForm';
import { FunctionList } from '@/features/events/components/FunctionList';
import { sortFunctionsChronologically } from '@/features/events/services/functionSorting';
import { functionService } from '@/app/services';
import { EventFunction } from '@/types/eventFunction';
import { FunctionError } from '@/lib/appError';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type FormMode = 'closed' | 'add' | EventFunction;

function FunctionsNotice({ title, body }: { title: string; body: string }): JSX.Element {
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

/**
 * `/events/:eventId/functions` — the event's functions/ceremonies list.
 * Same access check as the workspace Overview; Add/Edit/Delete are
 * additionally gated by `canManage` (owner/planner), enforced for real by
 * the createFunction/updateFunction/deleteFunction Cloud Functions
 * regardless of what this page shows. Sorting runs client-side over the
 * already-loaded (already-scoped) list — no new queries.
 */
export function FunctionsPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { state, reload } = useFunctionList(user?.id ?? null, eventId);
  const { show: showToast } = useToast();

  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [deleteTarget, setDeleteTarget] = useState<EventFunction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedFunctions = useMemo(() => {
    if (state.status !== 'allowed') {
      return [];
    }
    return sortFunctionsChronologically(state.data.functions);
  }, [state]);

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await functionService.deleteFunction(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Function removed.', 'success');
      reload();
    } catch (err) {
      showToast(
        err instanceof FunctionError ? err.friendlyMessage : "We couldn't remove this function right now.",
        'danger'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="functions-page">
      {state.status === 'loading' && <LoadingState label="Loading functions…" />}

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
          <div className="functions-header">
            <div>
              <h1>Functions</h1>
              <p className="functions-subtitle">Every ceremony and event, in one place.</p>
            </div>
            {state.data.canManage && <Button onClick={() => setFormMode('add')}>+ Add Function</Button>}
          </div>

          <FunctionList
            functions={sortedFunctions}
            canManage={state.data.canManage}
            onAdd={() => setFormMode('add')}
            onEdit={(fn) => setFormMode(fn)}
            onDelete={(fn) => setDeleteTarget(fn)}
          />

          {formMode !== 'closed' && (
            <Modal
              open
              onClose={() => setFormMode('closed')}
              title={formMode === 'add' ? 'Add Function' : 'Edit Function'}
            >
              <FunctionForm
                eventId={eventId}
                fn={formMode === 'add' ? undefined : formMode}
                onSaved={(message) => {
                  setFormMode('closed');
                  showToast(message, 'success');
                  reload();
                }}
                onCancel={() => setFormMode('closed')}
              />
            </Modal>
          )}

          {deleteTarget && (
            <Modal open onClose={() => setDeleteTarget(null)} title="Remove function?">
              <p className="function-confirm-body">
                Remove {deleteTarget.name} from this event? This can&apos;t be undone.
              </p>
              <div className="auth-form-actions">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                  {deleting ? 'Removing…' : 'Remove Function'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
