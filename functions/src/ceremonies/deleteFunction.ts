import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

export interface DeleteFunctionInput {
  functionId: string;
}

export interface DeleteFunctionOutput {
  functionId: string;
}

interface AuthContext {
  uid: string;
}

export function validateDeleteFunctionInput(input: unknown): DeleteFunctionInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.functionId || typeof obj.functionId !== 'string') {
    throw new ValidationError('invalid_function_id', 'functionId must be a non-empty string.');
  }

  return { functionId: obj.functionId };
}

/**
 * Deletes a function/ceremony after verifying the caller has event
 * management authority over the function's *stored* eventId — never a
 * client-supplied value.
 *
 * @throws ValidationError('function_not_found') if the function does not exist
 */
export async function deleteFunction(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: DeleteFunctionInput
): Promise<DeleteFunctionOutput> {
  const functionRef = db.collection('functions').doc(input.functionId);
  const snapshot = await functionRef.get();
  const existing = snapshot.data() as { eventId?: string } | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('function_not_found', 'Function not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);
  await functionRef.delete();

  return { functionId: input.functionId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleDeleteFunction(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<DeleteFunctionOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateDeleteFunctionInput(data);
  return deleteFunction(db, { uid: context.auth.uid }, input);
}
