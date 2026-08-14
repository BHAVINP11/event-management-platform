"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeleteFunctionInput = validateDeleteFunctionInput;
exports.deleteFunction = deleteFunction;
exports.handleDeleteFunction = handleDeleteFunction;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
function validateDeleteFunctionInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.functionId || typeof obj.functionId !== 'string') {
        throw new validation_1.ValidationError('invalid_function_id', 'functionId must be a non-empty string.');
    }
    return { functionId: obj.functionId };
}
/**
 * Deletes a function/ceremony after verifying the caller has event
 * management authority over the function's *stored* eventId — never a
 * client-supplied value.
 *
 * @throws ValidationError('function_not_found') if the function does not exist
 */
async function deleteFunction(db, auth, input) {
    const functionRef = db.collection('functions').doc(input.functionId);
    const snapshot = await functionRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('function_not_found', 'Function not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
    await functionRef.delete();
    return { functionId: input.functionId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleDeleteFunction(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateDeleteFunctionInput(data);
    return deleteFunction(db, { uid: context.auth.uid }, input);
}
