import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

/** The Storage folder every event's cover photo lives under: `event-covers/{eventId}/{fileName}`. */
export const EVENT_COVERS_STORAGE_PREFIX = 'event-covers';

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
  file(path: string): { delete(): Promise<unknown> };
}

/**
 * Extracts the Storage object path from a Firebase Storage download URL
 * (`https://.../o/ENCODED_PATH?alt=media&token=...`). Returns null if the
 * URL doesn't match that shape — callers must treat that as "don't know
 * how to clean this up" rather than guessing.
 */
export function extractStoragePathFromDownloadUrl(url: string): string | null {
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
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
export function validateCoverImageUrl(eventId: string, value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('invalid_cover_image_url', 'coverImageUrl must be a non-empty string or null.');
  }

  const path = extractStoragePathFromDownloadUrl(value);
  const expectedPrefix = `${EVENT_COVERS_STORAGE_PREFIX}/${eventId}/`;
  if (!path || !path.startsWith(expectedPrefix)) {
    throw new ValidationError(
      'invalid_cover_image_url',
      "coverImageUrl must reference this event's own cover-image storage path."
    );
  }

  return value;
}

export function validateUpdateEventCoverImageInput(input: unknown): UpdateEventCoverImageInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
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
export async function updateEventCoverImage(
  db: FirebaseFirestore.Firestore,
  bucket: StorageBucketLike,
  auth: AuthContext,
  input: UpdateEventCoverImageInput
): Promise<UpdateEventCoverImageOutput> {
  await verifyEventManagementAuthority(db, input.eventId, auth.uid);

  const eventRef = db.collection('events').doc(input.eventId);
  const snapshot = await eventRef.get();

  if (!snapshot.exists) {
    throw new ValidationError('event_not_found', 'Event not found.');
  }

  const existing = snapshot.data() as { coverImageUrl?: string | null } | undefined;
  const previousUrl = existing?.coverImageUrl ?? null;

  const now = new Date().toISOString();
  await eventRef.update({ coverImageUrl: input.coverImageUrl, updatedAt: now });

  if (previousUrl && previousUrl !== input.coverImageUrl) {
    const previousPath = extractStoragePathFromDownloadUrl(previousUrl);
    const expectedPrefix = `${EVENT_COVERS_STORAGE_PREFIX}/${input.eventId}/`;
    if (previousPath && previousPath.startsWith(expectedPrefix)) {
      try {
        await bucket.file(previousPath).delete();
      } catch {
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
export async function handleUpdateEventCoverImage(
  db: FirebaseFirestore.Firestore,
  bucket: StorageBucketLike,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateEventCoverImageOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateEventCoverImageInput(data);
  return updateEventCoverImage(db, bucket, { uid: context.auth.uid }, input);
}
