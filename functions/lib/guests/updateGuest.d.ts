import { CallableAuthContext } from '../shared/callableContext';
import { GuestFields } from './shared';
export interface UpdateGuestInput extends GuestFields {
    guestId: string;
}
export interface UpdateGuestOutput {
    guestId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateGuestInput(input: unknown): UpdateGuestInput;
/**
 * Updates a guest after verifying the caller has a management role (owner
 * or planner) for the guest's *stored* event — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event. `id`,
 * `eventId`, `createdBy`, and `createdAt` are carried over from the existing
 * document regardless of what the client sends.
 *
 * @throws ValidationError('guest_not_found') if the guest does not exist
 */
export declare function updateGuest(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateGuestInput): Promise<UpdateGuestOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateGuest(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateGuestOutput>;
export {};
