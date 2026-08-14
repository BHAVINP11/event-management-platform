"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateEventBudgetInput = validateUpdateEventBudgetInput;
exports.updateEventBudget = updateEventBudget;
exports.handleUpdateEventBudget = handleUpdateEventBudget;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
function validateUpdateEventBudgetInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const budgetAmount = (0, validation_1.validateBudgetAmount)(obj.budgetAmount);
    return { eventId: obj.eventId, budgetAmount };
}
/**
 * Sets an event's budget after verifying the caller has event management
 * authority (owner/planner only). Patches only `budgetAmount` and
 * `updatedAt` on the existing event document — the budget is a field on
 * the Event itself, not a separate collection, and this never touches any
 * other event field.
 */
async function updateEventBudget(db, auth, input) {
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, auth.uid);
    const now = new Date().toISOString();
    const eventRef = db.collection('events').doc(input.eventId);
    await eventRef.update({ budgetAmount: input.budgetAmount, updatedAt: now });
    return { eventId: input.eventId, budgetAmount: input.budgetAmount };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateEventBudget(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateEventBudgetInput(data);
    return updateEventBudget(db, { uid: context.auth.uid }, input);
}
