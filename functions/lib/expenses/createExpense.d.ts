import { CallableAuthContext } from '../shared/callableContext';
import { ExpenseFields } from './shared';
export interface CreateExpenseInput extends ExpenseFields {
    eventId: string;
}
export interface CreateExpenseOutput {
    expenseId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCreateExpenseInput(input: unknown): CreateExpenseInput;
/**
 * Creates an expense after verifying the caller has event management
 * authority (owner/planner only). The client never chooses `id`,
 * `createdBy`, or the timestamps.
 */
export declare function createExpense(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateExpenseInput): Promise<CreateExpenseOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateExpense(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateExpenseOutput>;
export {};
