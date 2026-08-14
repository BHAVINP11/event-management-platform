"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateExpenseInput = validateCreateExpenseInput;
exports.createExpense = createExpense;
exports.handleCreateExpense = handleCreateExpense;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateCreateExpenseInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateExpenseFields)(obj);
    return { eventId: obj.eventId, ...fields };
}
/**
 * Creates an expense after verifying the caller has event management
 * authority (owner/planner only). The client never chooses `id`,
 * `createdBy`, or the timestamps.
 */
async function createExpense(db, auth, input) {
    const userId = auth.uid;
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, userId);
    const now = new Date().toISOString();
    const expenseRef = db.collection('expenses').doc();
    const expenseId = expenseRef.id;
    await expenseRef.set((0, shared_1.buildExpenseDocument)(expenseId, input.eventId, userId, input, now, now));
    return { expenseId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleCreateExpense(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateExpenseInput(data);
    return createExpense(db, { uid: context.auth.uid }, input);
}
