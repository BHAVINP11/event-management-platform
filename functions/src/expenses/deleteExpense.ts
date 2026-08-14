import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

export interface DeleteExpenseInput {
  expenseId: string;
}

export interface DeleteExpenseOutput {
  expenseId: string;
}

interface AuthContext {
  uid: string;
}

export function validateDeleteExpenseInput(input: unknown): DeleteExpenseInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.expenseId || typeof obj.expenseId !== 'string') {
    throw new ValidationError('invalid_expense_id', 'expenseId must be a non-empty string.');
  }

  return { expenseId: obj.expenseId };
}

/**
 * Deletes an expense after verifying the caller has event management
 * authority over the expense's *stored* eventId — never a client-supplied
 * value.
 *
 * @throws ValidationError('expense_not_found') if the expense does not exist
 */
export async function deleteExpense(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: DeleteExpenseInput
): Promise<DeleteExpenseOutput> {
  const expenseRef = db.collection('expenses').doc(input.expenseId);
  const snapshot = await expenseRef.get();
  const existing = snapshot.data() as { eventId?: string } | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('expense_not_found', 'Expense not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);
  await expenseRef.delete();

  return { expenseId: input.expenseId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleDeleteExpense(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<DeleteExpenseOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateDeleteExpenseInput(data);
  return deleteExpense(db, { uid: context.auth.uid }, input);
}
