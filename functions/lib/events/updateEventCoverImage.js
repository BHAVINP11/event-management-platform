"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_COVERS_STORAGE_PREFIX = void 0;
exports.extractStoragePathFromDownloadUrl = extractStoragePathFromDownloadUrl;
exports.validateCoverImageUrl = validateCoverImageUrl;
exports.validateUpdateEventCoverImageInput = validateUpdateEventCoverImageInput;
exports.updateEventCoverImage = updateEventCoverImage;
exports.handleUpdateEventCoverImage = handleUpdateEventCoverImage;
const validation_1 = require("../validation");
const eventAuthority_1 = require("../shared/eventAuthority");
/** The Storage folder every event's cover photo lives under: `event-covers/{eventId}/{fileName}`. */
exports.EVENT_COVERS_STORAGE_PREFIX = 'event-covers';
/**
 * Extracts the Storage object path from a Firebase Storage download URL
 * (`https://.../o/ENCODED_PATH?alt=media&token=...`). Returns null if the
 * URL doesn't match that shape — callers must treat that as "don't know
 * how to clean this up" rather than guessing.
 */
function extractStoragePathFromDownloadUrl(url) {
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) {
        return null;
    }
    try {
        return decodeURIComponent(match[1]);
    }
    catch {
        return null;
    }
}
/**
 * Validates a cover image URL for a specific event. `null` means "remove
 * the cover image" and is always valid. A non-null value must be a
 * Firebase Storage download URL whose object path is scoped to this
 * event's own `event-covers/{eventId}/` folder — never another event's,
 * and never an arbitrary external URL.
 */
function validateCoverImageUrl(eventId, value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new validation_1.ValidationError('invalid_cover_image_url', 'coverImageUrl must be a non-empty string or null.');
    }
    const path = extractStoragePathFromDownloadUrl(value);
    const expectedPrefix = `${exports.EVENT_COVERS_STORAGE_PREFIX}/${eventId}/`;
    if (!path || !path.startsWith(expectedPrefix)) {
        throw new validation_1.ValidationError('invalid_cover_image_url', "coverImageUrl must reference this event's own cover-image storage path.");
    }
    return value;
}
function validateUpdateEventCoverImageInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.eventId || typeof obj.eventId !== 'string') {
        throw new validation_1.ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
    }
    const coverImageUrl = validateCoverImageUrl(obj.eventId, obj.coverImageUrl);
    return { eventId: obj.eventId, coverImageUrl };
}
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
async function updateEventCoverImage(db, bucket, auth, input) {
    await (0, eventAuthority_1.verifyEventManagementAuthority)(db, input.eventId, auth.uid);
    const eventRef = db.collection('events').doc(input.eventId);
    const snapshot = await eventRef.get();
    if (!snapshot.exists) {
        throw new validation_1.ValidationError('event_not_found', 'Event not found.');
    }
    const existing = snapshot.data();
    const previousUrl = existing?.coverImageUrl ?? null;
    const now = new Date().toISOString();
    await eventRef.update({ coverImageUrl: input.coverImageUrl, updatedAt: now });
    if (previousUrl && previousUrl !== input.coverImageUrl) {
        const previousPath = extractStoragePathFromDownloadUrl(previousUrl);
        const expectedPrefix = `${exports.EVENT_COVERS_STORAGE_PREFIX}/${input.eventId}/`;
        if (previousPath && previousPath.startsWith(expectedPrefix)) {
            try {
                await bucket.file(previousPath).delete();
            }
            catch {
                // Best-effort cleanup only — a missing/already-deleted file must
                // never fail the Firestore update that already succeeded.
            }
        }
    }
    return { eventId: input.eventId, coverImageUrl: input.coverImageUrl };
}
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update, clean up.
 */
async function handleUpdateEventCoverImage(db, bucket, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateEventCoverImageInput(data);
    return updateEventCoverImage(db, bucket, { uid: context.auth.uid }, input);
}
