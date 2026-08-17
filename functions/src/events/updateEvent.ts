import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { EventEditFields, buildEventUpdateDocument, validateEventEditFields } from './shared';

export interface UpdateEventInput extends EventEditFields {
  eventId: string;
}

export interface UpdateEventOutput {
  eventId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingEventData {
  organizationId?: string | null;
  createdBy?: string;
  createdAt?: string;
  budgetAmount?: number;
  coverImageUrl?: string | null;
}

export function validateUpdateEventInput(input: unknown): UpdateEventInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateEventEditFields(obj);

  return { eventId: obj.eventId, ...fields };
}

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
export async function updateEvent(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateEventInput
): Promise<UpdateEventOutput> {
  await verifyEventManagementAuthority(db, input.eventId, auth.uid);

  const eventRef = db.collection('events').doc(input.eventId);
  const snapshot = await eventRef.get();
  const existing = snapshot.data() as ExistingEventData | undefined;

  if (!snapshot.exists || !existing) {
    throw new ValidationError('event_not_found', 'Event not found.');
  }

  const now = new Date().toISOString();

  await eventRef.set(
    buildEventUpdateDocument(
      input.eventId,
      existing.createdBy ?? auth.uid,
      existing.organizationId ?? null,
      input,
      existing.createdAt ?? now,
      now,
      { budgetAmount: existing.budgetAmount, coverImageUrl: existing.coverImageUrl }
    )
  );

  return { eventId: input.eventId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateEvent(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateEventOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateEventInput(data);
  return updateEvent(db, { uid: context.auth.uid }, input);
}
