import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';

export interface DeleteVendorInput {
  vendorId: string;
}

export interface DeleteVendorOutput {
  vendorId: string;
}

interface AuthContext {
  uid: string;
}

export function validateDeleteVendorInput(input: unknown): DeleteVendorInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.vendorId || typeof obj.vendorId !== 'string') {
    throw new ValidationError('invalid_vendor_id', 'vendorId must be a non-empty string.');
  }

  return { vendorId: obj.vendorId };
}

/**
 * Deletes a vendor after verifying the caller has event management
 * authority over the vendor's *stored* eventId — never a client-supplied
 * value.
 *
 * @throws ValidationError('vendor_not_found') if the vendor does not exist
 */
export async function deleteVendor(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: DeleteVendorInput
): Promise<DeleteVendorOutput> {
  const vendorRef = db.collection('vendors').doc(input.vendorId);
  const snapshot = await vendorRef.get();
  const existing = snapshot.data() as { eventId?: string } | undefined;

  if (!snapshot.exists || !existing || !existing.eventId) {
    throw new ValidationError('vendor_not_found', 'Vendor not found.');
  }

  await verifyEventManagementAuthority(db, existing.eventId, auth.uid);
  await vendorRef.delete();

  return { vendorId: input.vendorId };
}

/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleDeleteVendor(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<DeleteVendorOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateDeleteVendorInput(data);
  return deleteVendor(db, { uid: context.auth.uid }, input);
}
