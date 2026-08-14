import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { VendorFields, buildVendorDocument, validateVendorFields } from './shared';

export interface CreateVendorInput extends VendorFields {
  eventId: string;
}

export interface CreateVendorOutput {
  vendorId: string;
}

interface AuthContext {
  uid: string;
}

export function validateCreateVendorInput(input: unknown): CreateVendorInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateVendorFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Creates a vendor after verifying the caller has event management
 * authority (owner/planner only). The client never chooses `id`,
 * `createdBy`, or the timestamps.
 */
export async function createVendor(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateVendorInput
): Promise<CreateVendorOutput> {
  const userId = auth.uid;

  await verifyEventManagementAuthority(db, input.eventId, userId);

  const now = new Date().toISOString();
  const vendorRef = db.collection('vendors').doc();
  const vendorId = vendorRef.id;

  await vendorRef.set(buildVendorDocument(vendorId, input.eventId, userId, input, now, now));

  return { vendorId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateVendor(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateVendorOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateVendorInput(data);
  return createVendor(db, { uid: context.auth.uid }, input);
}
