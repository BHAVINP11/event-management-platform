import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { CeremonyFields, buildCeremonyDocument, validateCeremonyFields } from './shared';

export interface UpdateFunctionInput extends CeremonyFields {
  functionId: string;
}

export interface UpdateFunctionOutput {
  functionId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingFunctionData {
  eventId?: string;
  createdBy?: string;
  createdAt?: string;
}

export function validateUpdateFunctionInput(input: unknown): UpdateFunctionInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.functionId || typeof obj.functionId !== 'string') {
    throw new ValidationError('invalid_function_id', 'functionId must be a non-empty string.');
  }

  const fields = validateCeremonyFields(obj);

  return { functionId: obj.functionId, ...fields };
}

/**
 * Updates a function/ceremony after verifying the caller has event
 * management authority over the function's *stored* eventId — never a
 * client-supplied eventId, so a client cannot retarget an edit at a
 * different event's function. `id`, `eventId`, `createdBy`, and
 * `createdAt` are carried over from the existing document regardless of
 * what the client sends.
 *
 * @throws ValidationError('function_not_found') if the function does not exist
 */
export async function updateFunction(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateFunctionInput
): Promise<UpdateFunctionOutput> {
  const functionRef = db.collection('functions').doc(input.functionId);
  const snapshot = await functionRef.get();
  const existing = snapshot.data() as ExistingFunctionData | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('function_not_found', 'Function not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);

  const now = new Date().toISOString();
  await functionRef.set(
    buildCeremonyDocument(
      input.functionId,
      existing.eventId,
      existing.createdBy ?? auth.uid,
      input,
      existing.createdAt ?? now,
      now
    )
  );

  return { functionId: input.functionId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateFunction(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateFunctionOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateFunctionInput(data);
  return updateFunction(db, { uid: context.auth.uid }, input);
}
