import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { VendorFields, buildVendorDocument, validateVendorFields } from './shared';

export interface UpdateVendorInput extends VendorFields {
  vendorId: string;
}

export interface UpdateVendorOutput {
  vendorId: string;
}

interface AuthContext {
  uid: string;
}

interface ExistingVendorData {
  eventId?: string;
  createdBy?: string;
  createdAt?: string;
}

export function validateUpdateVendorInput(input: unknown): UpdateVendorInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.vendorId || typeof obj.vendorId !== 'string') {
    throw new ValidationError('invalid_vendor_id', 'vendorId must be a non-empty string.');
  }

  const fields = validateVendorFields(obj);

  return { vendorId: obj.vendorId, ...fields };
}

/**
 * Updates a vendor after verifying the caller has event management
 * authority over the vendor's *stored* eventId — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event's
 * vendor. `id`, `eventId`, `createdBy`, and `createdAt` are carried over
 * from the existing document regardless of what the client sends.
 *
 * @throws ValidationError('vendor_not_found') if the vendor does not exist
 */
export async function updateVendor(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateVendorInput
): Promise<UpdateVendorOutput> {
  const vendorRef = db.collection('vendors').doc(input.vendorId);
  const snapshot = await vendorRef.get();
  const existing = snapshot.data() as ExistingVendorData | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('vendor_not_found', 'Vendor not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);

  const now = new Date().toISOString();
  await vendorRef.set(
    buildVendorDocument(
      input.vendorId,
      existing.eventId,
      existing.createdBy ?? auth.uid,
      input,
      existing.createdAt ?? now,
      now
    )
  );

  return { vendorId: input.vendorId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleUpdateVendor(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateVendorOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateVendorInput(data);
  return updateVendor(db, { uid: context.auth.uid }, input);
}
