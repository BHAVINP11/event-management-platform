import { ValidationError, validateBudgetAmount } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

export interface UpdateEventBudgetInput {
  eventId: string;
  budgetAmount: number;
}

export interface UpdateEventBudgetOutput {
  eventId: string;
  budgetAmount: number;
}

interface AuthContext {
  uid: string;
}

export function validateUpdateEventBudgetInput(input: unknown): UpdateEventBudgetInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const budgetAmount = validateBudgetAmount(obj.budgetAmount);

  return { eventId: obj.eventId, budgetAmount };
}

/**
 * Sets an event's budget after verifying the caller has event management
 * authority (owner/planner only). Patches only `budgetAmount` and
 * `updatedAt` on the existing event document — the budget is a field on
 * the Event itself, not a separate collection, and this never touches any
 * other event field.
 */
export async function updateEventBudget(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateEventBudgetInput
): Promise<UpdateEventBudgetOutput> {
  await verifyEventManagementAuthority(db, input.eventId, auth.uid);

  const now = new Date().toISOString();
  const eventRef = db.collection('events').doc(input.eventId);
  await eventRef.update({ budgetAmount: input.budgetAmount, updatedAt: now });

  return { eventId: input.eventId, budgetAmount: input.budgetAmount };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateEventBudget(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateEventBudgetOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateEventBudgetInput(data);
  return updateEventBudget(db, { uid: context.auth.uid }, input);
}
