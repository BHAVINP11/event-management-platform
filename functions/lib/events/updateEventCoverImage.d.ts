import { CallableAuthContext } from '../shared/callableContext';
/** The Storage folder every event's cover photo lives under: `event-covers/{eventId}/{fileName}`. */
export declare const EVENT_COVERS_STORAGE_PREFIX = "event-covers";
export interface UpdateEventCoverImageInput {
    eventId: string;
    coverImageUrl: string | null;
}
export interface UpdateEventCoverImageOutput {
    eventId: string;
    coverImageUrl: string | null;
}
interface AuthContext {
    uid: string;
}
/** The subset of a `@google-cloud/storage` Bucket this module needs — narrow so it's fake-able in tests. */
export interface StorageBucketLike {
    file(path: string): {
        delete(): Promise<unknown>;
    };
}
/**
 * Extracts the Storage object path from a Firebase Storage download URL
 * (`https://.../o/ENCODED_PATH?alt=media&token=...`). Returns null if the
 * URL doesn't match that shape — callers must treat that as "don't know
 * how to clean this up" rather than guessing.
 */
export declare function extractStoragePathFromDownloadUrl(url: string): string | null;
/**
 * Validates a cover image URL for a specific event. `null` means "remove
 * the cover image" and is always valid. A non-null value must be a
 * Firebase Storage download URL whose object path is scoped to this
 * event's own `event-covers/{eventId}/` folder — never another event's,
 * and never an arbitrary external URL.
 */
export declare function validateCoverImageUrl(eventId: string, value: unknown): string | null;
export declare function validateUpdateEventCoverImageInput(input: unknown): UpdateEventCoverImageInput;
/**
 * Sets or removes an event's cover photo. The client uploads the file to
 * Storage directly (gated by `storage.rules`' own owner/planner check) and
 * calls this function only to persist the resulting URL — or `null` to
 * remove it — onto the event document. When replacing or removing a
 * previous cover image, the old Storage object is deleted so it doesn't
 * become an orphaned file; deletion is best-effort and scoped strictly to
 * this event's own `event-covers/{eventId}/` folder, so it can never touch
 * another event's files, and a missing/already-deleted file never fails
 * the update.
 */
export declare function updateEventCoverImage(db: FirebaseFirestore.Firestore, bucket: StorageBucketLike, auth: AuthContext, input: UpdateEventCoverImageInput): Promise<UpdateEventCoverImageOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update, clean up.
 */
export declare function handleUpdateEventCoverImage(db: FirebaseFirestore.Firestore, bucket: StorageBucketLike, data: unknown, context: CallableAuthContext): Promise<UpdateEventCoverImageOutput>;
export {};
