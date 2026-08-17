import { CallableAuthContext } from '../shared/callableContext';
import { EventEditFields } from './shared';
export interface UpdateEventInput extends EventEditFields {
    eventId: string;
}
export interface UpdateEventOutput {
    eventId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateEventInput(input: unknown): UpdateEventInput;
/**
 * Updates an event's name/type/description/dates/timezone/venue/status
 * after verifying the caller has event management authority (owner/
 * planner only). A full document replacement (see
 * `buildEventUpdateDocument`), so clearing an optional field (e.g.
 * removing a venue) actually removes it. `budgetAmount` and
 * `coverImageUrl` are carried over unchanged from the existing
 * document — this function never touches either; they have their own
 * dedicated update functions (`updateEventBudget`,
 * `updateEventCoverImage`). `organizationId`, `createdBy`, and
 * `createdAt` are always read from the existing document, never from
 * the client payload.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 */
export declare function updateEvent(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateEventInput): Promise<UpdateEventOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateEvent(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateEventOutput>;
export {};
