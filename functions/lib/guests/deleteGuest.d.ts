import { CallableAuthContext } from '../shared/callableContext';
export interface DeleteGuestInput {
    guestId: string;
}
export interface DeleteGuestOutput {
    guestId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateDeleteGuestInput(input: unknown): DeleteGuestInput;
/**
 * Deletes a guest after verifying the caller may delete it, checked
 * against the guest's *stored* eventId and side — never a client-supplied
 * value.
 *
 * @throws ValidationError('guest_not_found') if the guest does not exist
 */
export declare function deleteGuest(db: FirebaseFirestore.Firestore, auth: AuthContext, input: DeleteGuestInput): Promise<DeleteGuestOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleDeleteGuest(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<DeleteGuestOutput>;
export {};
