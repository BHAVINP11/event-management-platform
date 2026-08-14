"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateExpenseInput = validateUpdateExpenseInput;
exports.updateExpense = updateExpense;
exports.handleUpdateExpense = handleUpdateExpense;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateUpdateExpenseInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.expenseId || typeof obj.expenseId !== 'string') {
        throw new validation_1.ValidationError('invalid_expense_id', 'expenseId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateExpenseFields)(obj);
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
async function updateExpense(db, auth, input) {
    const expenseRef = db.collection('expenses').doc(input.expenseId);
    const snapshot = await expenseRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('expense_not_found', 'Expense not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
    const now = new Date().toISOString();
    await expenseRef.set((0, shared_1.buildExpenseDocument)(input.expenseId, existing.eventId, existing.createdBy ?? auth.uid, input, existing.createdAt ?? now, now));
    return { expenseId: input.expenseId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateExpense(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateExpenseInput(data);
    return updateExpense(db, { uid: context.auth.uid }, input);
}
