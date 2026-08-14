import { CallableAuthContext } from '../shared/callableContext';
import { GuestFields } from './shared';
export interface CreateGuestInput extends GuestFields {
    eventId: string;
}
export interface CreateGuestOutput {
    guestId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCreateGuestInput(input: unknown): CreateGuestInput;
/**
 * Creates a guest after verifying the caller may create a guest of the
 * requested side for the event: owner/planner may create any side; a
 * couple member (bride/groom) only bride/both or groom/both respectively;
 * family/staff/viewer may not create at all. The client never chooses
 * `id`, `createdBy`, or the timestamps.
 */
export declare function createGuest(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateGuestInput): Promise<CreateGuestOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateGuest(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateGuestOutput>;
export {};
