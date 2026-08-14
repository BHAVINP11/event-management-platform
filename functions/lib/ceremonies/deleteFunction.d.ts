import { CallableAuthContext } from '../shared/callableContext';
export interface DeleteFunctionInput {
    functionId: string;
}
export interface DeleteFunctionOutput {
    functionId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateDeleteFunctionInput(input: unknown): DeleteFunctionInput;
/**
 * Deletes a function/ceremony after verifying the caller has event
 * management authority over the function's *stored* eventId — never a
 * client-supplied value.
 *
 * @throws ValidationError('function_not_found') if the function does not exist
 */
export declare function deleteFunction(db: FirebaseFirestore.Firestore, auth: AuthContext, input: DeleteFunctionInput): Promise<DeleteFunctionOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleDeleteFunction(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<DeleteFunctionOutput>;
export {};
