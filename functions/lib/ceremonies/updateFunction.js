"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateFunctionInput = validateUpdateFunctionInput;
exports.updateFunction = updateFunction;
exports.handleUpdateFunction = handleUpdateFunction;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
const shared_1 = require("./shared");
function validateUpdateFunctionInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.functionId || typeof obj.functionId !== 'string') {
        throw new validation_1.ValidationError('invalid_function_id', 'functionId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateCeremonyFields)(obj);
    return { functionId: obj.functionId, ...fields };
}
/**
 * Updates a function/ceremony after verifying the caller has event
 * management authority over the function's *stored* eventId — never a
 * client-supplied eventId, so a client cannot retarget an edit at a
 * different event's function. `id`, `eventId`, `createdBy`, and
 * `createdAt` are carried over from the existing document regardless of
 * what the client sends.
 *
 * @throws ValidationError('function_not_found') if the function does not exist
 */
async function updateFunction(db, auth, input) {
    const functionRef = db.collection('functions').doc(input.functionId);
    const snapshot = await functionRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing || !existing.eventId) {
        throw new validation_1.ValidationError('function_not_found', 'Function not found.');
    }
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, existing.eventId, auth.uid);
    const now = new Date().toISOString();
    await functionRef.set((0, shared_1.buildCeremonyDocument)(input.functionId, existing.eventId, existing.createdBy ?? auth.uid, input, existing.createdAt ?? now, now));
    return { functionId: input.functionId };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleUpdateFunction(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateFunctionInput(data);
    return updateFunction(db, { uid: context.auth.uid }, input);
}
