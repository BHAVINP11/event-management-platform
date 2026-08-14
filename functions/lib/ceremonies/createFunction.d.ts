import { CallableAuthContext } from '../shared/callableContext';
import { CeremonyFields } from './shared';
export interface CreateFunctionInput extends CeremonyFields {
    eventId: string;
}
export interface CreateFunctionOutput {
    functionId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCreateFunctionInput(input: unknown): CreateFunctionInput;
/**
 * Creates a function/ceremony after verifying the caller has event
 * management authority (owner/planner only). The client never chooses
 * `id`, `createdBy`, or the timestamps.
 */
export declare function createFunction(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateFunctionInput): Promise<CreateFunctionOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateFunction(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateFunctionOutput>;
export {};
