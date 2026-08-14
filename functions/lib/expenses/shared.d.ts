export declare const EXPENSE_CATEGORIES: readonly ["venue", "catering", "decoration", "photography", "entertainment", "transportation", "accommodation", "jewellery", "clothing", "invitation", "other"];
export declare const PAYMENT_STATUSES: readonly ["unpaid", "partially_paid", "paid"];
export interface ExpenseFields {
    title: string;
    category: string;
    amount: number;
    paymentStatus: string;
    paidAmount: number;
    paymentDate?: string;
    notes?: string;
}
/** Validates the fields common to expense creation and editing. Throws ValidationError. */
export declare function validateExpenseFields(obj: Record<string, unknown>): ExpenseFields;
/**
 * Builds a Firestore expense document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createExpense passes
 * the authenticated uid and "now"; updateExpense passes the existing
 * document's values, so an edit can never change who created it or when.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export declare function buildExpenseDocument(expenseId: string, eventId: string, createdBy: string, fields: ExpenseFields, createdAt: string, updatedAt: string): Record<string, unknown>;
