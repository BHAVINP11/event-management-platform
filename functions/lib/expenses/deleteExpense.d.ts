import { CallableAuthContext } from '../shared/callableContext';
export interface DeleteExpenseInput {
    expenseId: string;
}
export interface DeleteExpenseOutput {
    expenseId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateDeleteExpenseInput(input: unknown): DeleteExpenseInput;
/**
 * Deletes an expense after verifying the caller has event management
 * authority over the expense's *stored* eventId — never a client-supplied
 * value.
 *
 * @throws ValidationError('expense_not_found') if the expense does not exist
 */
export declare function deleteExpense(db: FirebaseFirestore.Firestore, auth: AuthContext, input: DeleteExpenseInput): Promise<DeleteExpenseOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleDeleteExpense(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<DeleteExpenseOutput>;
export {};
