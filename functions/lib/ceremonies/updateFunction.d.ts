import { CallableAuthContext } from '../shared/callableContext';
import { CeremonyFields } from './shared';
export interface UpdateFunctionInput extends CeremonyFields {
    functionId: string;
}
export interface UpdateFunctionOutput {
    functionId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateFunctionInput(input: unknown): UpdateFunctionInput;
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
export declare function updateFunction(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateFunctionInput): Promise<UpdateFunctionOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateFunction(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateFunctionOutput>;
export {};
