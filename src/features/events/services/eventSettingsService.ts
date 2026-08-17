import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { functions } from '@/services/firebase/functions';
import { storage } from '@/services/firebase/storage';
import { EventSettingsFormInput } from '@/features/events/types/eventSettings';
import { EventSettingsError } from '@/lib/appError';

interface UpdateEventCallableInput extends EventSettingsFormInput {
  eventId: string;
}

interface UpdateEventCoverImageCallableInput {
  eventId: string;
  coverImageUrl: string | null;
}

interface UpdateEventCoverImageCallableOutput {
  eventId: string;
  coverImageUrl: string | null;
}

const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the event's details don't look right. Please check and try again.",
  invalid_name: 'Please enter a valid event name.',
  invalid_type: 'Please select a valid event type.',
  invalid_start_date: 'Please enter a valid start date.',
  invalid_end_date: 'The end date cannot be before the start date.',
  invalid_timezone: 'Please select a valid timezone.',
  invalid_venue_name: 'Please enter a valid venue name.',
  invalid_venue_address: 'Please enter a valid venue address.',
  invalid_status: 'Please choose a valid status.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_cover_image_url: "We couldn't save that cover photo. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow editing this event.",
  permission_denied: 'You do not have permission to perform this action.',
  internal_error: 'Something went wrong. Please try again.'
};

/**
 * Cloud Functions can only throw a small fixed set of codes — the
 * application's own code travels separately in `error.details.appCode` (see
 * `functions/src/errorMapping.ts`). That's the code this service keys its
 * messaging off of; the standard Firebase code is only a fallback.
 */
const toEventSettingsError = (error: unknown): EventSettingsError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new EventSettingsError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

const sanitizeFileName = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Edits an event's details/status and manages its cover photo.
 *
 * Detail/status edits go exclusively through the trusted `onUpdateEvent`
 * Cloud Function, which independently re-verifies the caller's role
 * (owner/planner only). Cover photos upload directly to Storage from the
 * browser (authorized by `storage.rules`' own owner/planner check,
 * mirroring the same authorization this service's edits rely on) — this
 * service then calls `onUpdateEventCoverImage` only to persist the
 * resulting URL (or `null`, to remove it) onto the event document, which
 * also deletes the previous Storage object so it doesn't linger orphaned.
 */
export class EventSettingsService {
  async updateEvent(eventId: string, input: EventSettingsFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateEventCallableInput, { eventId: string }>(functions, 'onUpdateEvent');
      await callable({ eventId, ...input });
    } catch (error) {
      throw toEventSettingsError(error);
    }
  }

  /** Validates, uploads to Storage, and persists the resulting URL. Returns the new cover image URL. */
  async uploadCoverImage(eventId: string, file: File): Promise<string> {
    if (!ALLOWED_COVER_IMAGE_TYPES.includes(file.type)) {
      throw new EventSettingsError('invalid_cover_image_type', 'Please choose a JPEG, PNG, or WEBP image.');
    }
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      throw new EventSettingsError('invalid_cover_image_size', 'Please choose an image under 5 MB.');
    }

    try {
      const path = `event-covers/${eventId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const coverImageUrl = await getDownloadURL(storageRef);

      const callable = httpsCallable<UpdateEventCoverImageCallableInput, UpdateEventCoverImageCallableOutput>(
        functions,
        'onUpdateEventCoverImage'
      );
      const result = await callable({ eventId, coverImageUrl });
      return result.data.coverImageUrl ?? coverImageUrl;
    } catch (error) {
      if (error instanceof EventSettingsError) {
        throw error;
      }
      throw toEventSettingsError(error);
    }
  }

  async removeCoverImage(eventId: string): Promise<void> {
    try {
      const callable = httpsCallable<UpdateEventCoverImageCallableInput, UpdateEventCoverImageCallableOutput>(
        functions,
        'onUpdateEventCoverImage'
      );
      await callable({ eventId, coverImageUrl: null });
    } catch (error) {
      throw toEventSettingsError(error);
    }
  }
}
