"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeleteExpenseInput = validateDeleteExpenseInput;
exports.deleteExpense = deleteExpense;
exports.handleDeleteExpense = handleDeleteExpense;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
function validateDeleteExpenseInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.expenseId || typeof obj.expenseId !== 'string') {
        throw new validation_1.ValidationError('invalid_expense_id', 'expenseId must be a non-empty string.');
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
async function deleteExpense(db, auth, input) {
    const expenseRef = db.collection('expenses').doc(input.expenseId);
    const snapshot = await expenseRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('expense_not_found', 'Expense not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
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
async function handleDeleteExpense(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateDeleteExpenseInput(data);
    return deleteExpense(db, { uid: context.auth.uid }, input);
}
