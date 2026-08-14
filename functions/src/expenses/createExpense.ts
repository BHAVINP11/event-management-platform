import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { ExpenseFields, buildExpenseDocument, validateExpenseFields } from './shared';

export interface CreateExpenseInput extends ExpenseFields {
  eventId: string;
}

export interface CreateExpenseOutput {
  expenseId: string;
}

interface AuthContext {
  uid: string;
}

export function validateCreateExpenseInput(input: unknown): CreateExpenseInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateExpenseFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Creates an expense after verifying the caller has event management
 * authority (owner/planner only). The client never chooses `id`,
 * `createdBy`, or the timestamps.
 */
export async function createExpense(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateExpenseInput
): Promise<CreateExpenseOutput> {
  const userId = auth.uid;

  await verifyEventManagementAuthority(db, input.eventId, userId);

  const now = new Date().toISOString();
  const expenseRef = db.collection('expenses').doc();
  const expenseId = expenseRef.id;

  await expenseRef.set(buildExpenseDocument(expenseId, input.eventId, userId, input, now, now));

  return { expenseId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateExpense(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateExpenseOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateExpenseInput(data);
  return createExpense(db, { uid: context.auth.uid }, input);
}
