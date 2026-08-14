import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { ExpenseFields, buildExpenseDocument, validateExpenseFields } from './shared';

export interface UpdateExpenseInput extends ExpenseFields {
  expenseId: string;
}

export interface UpdateExpenseOutput {
  expenseId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingExpenseData {
  eventId?: string;
  createdBy?: string;
  createdAt?: string;
}

export function validateUpdateExpenseInput(input: unknown): UpdateExpenseInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.expenseId || typeof obj.expenseId !== 'string') {
    throw new ValidationError('invalid_expense_id', 'expenseId must be a non-empty string.');
  }

  const fields = validateExpenseFields(obj);

  return { expenseId: obj.expenseId, ...fields };
}

/**
 * Updates an expense after verifying the caller has event management
 * authority over the expense's *stored* eventId — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event's
 * expense. `id`, `eventId`, `createdBy`, and `createdAt` are carried over
 * from the existing document regardless of what the client sends.
 *
 * @throws ValidationError('expense_not_found') if the expense does not exist
 */
export async function updateExpense(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateExpenseInput
): Promise<UpdateExpenseOutput> {
  const expenseRef = db.collection('expenses').doc(input.expenseId);
  const snapshot = await expenseRef.get();
  const existing = snapshot.data() as ExistingExpenseData | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('expense_not_found', 'Expense not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);

  const now = new Date().toISOString();
  await expenseRef.set(
    buildExpenseDocument(
      input.expenseId,
      existing.eventId,
      existing.createdBy ?? auth.uid,
      input,
      existing.createdAt ?? now,
      now
    )
  );

  return { expenseId: input.expenseId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateExpense(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateExpenseOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateExpenseInput(data);
  return updateExpense(db, { uid: context.auth.uid }, input);
}
