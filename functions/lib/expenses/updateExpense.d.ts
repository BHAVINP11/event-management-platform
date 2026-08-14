import { CallableAuthContext } from '../shared/callableContext';
import { ExpenseFields } from './shared';
export interface UpdateExpenseInput extends ExpenseFields {
    expenseId: string;
}
export interface UpdateExpenseOutput {
    expenseId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateExpenseInput(input: unknown): UpdateExpenseInput;
/**
 * Updates an expense after verifying the caller has event management
 * authority over the expense's *stored* eventId — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event's
 * expense. `id`, `eventId`, `createdBy`, and `createdAt` are carried over
 * from the existing document regardless of what the client sends.
 *
 * @throws ValidationError('expense_not_found') if the expense does not exist
 */
export declare function updateExpense(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateExpenseInput): Promise<UpdateExpenseOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateExpense(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateExpenseOutput>;
export {};
