import { CallableAuthContext } from '../shared/callableContext';
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
export declare function validateUpdateEventBudgetInput(input: unknown): UpdateEventBudgetInput;
/**
 * Sets an event's budget after verifying the caller has event management
 * authority (owner/planner only). Patches only `budgetAmount` and
 * `updatedAt` on the existing event document — the budget is a field on
 * the Event itself, not a separate collection, and this never touches any
 * other event field.
 */
export declare function updateEventBudget(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateEventBudgetInput): Promise<UpdateEventBudgetOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateEventBudget(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateEventBudgetOutput>;
export {};
