import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { CeremonyFields, buildCeremonyDocument, validateCeremonyFields } from './shared';

export interface CreateFunctionInput extends CeremonyFields {
  eventId: string;
}

export interface CreateFunctionOutput {
  functionId: string;
}

interface AuthContext {
  uid: string;
}

export function validateCreateFunctionInput(input: unknown): CreateFunctionInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateCeremonyFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Creates a function/ceremony after verifying the caller has event
 * management authority (owner/planner only). The client never chooses
 * `id`, `createdBy`, or the timestamps.
 */
export async function createFunction(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateFunctionInput
): Promise<CreateFunctionOutput> {
  const userId = auth.uid;

  await verifyEventManagementAuthority(db, input.eventId, userId);

  const now = new Date().toISOString();
  const functionRef = db.collection('functions').doc();
  const functionId = functionRef.id;

  await functionRef.set(buildCeremonyDocument(functionId, input.eventId, userId, input, now, now));

  return { functionId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateFunction(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateFunctionOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateFunctionInput(data);
  return createFunction(db, { uid: context.auth.uid }, input);
}
