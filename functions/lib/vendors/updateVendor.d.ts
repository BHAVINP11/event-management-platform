import { CallableAuthContext } from '../shared/callableContext';
import { VendorFields } from './shared';
export interface UpdateVendorInput extends VendorFields {
    vendorId: string;
}
export interface UpdateVendorOutput {
    vendorId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateVendorInput(input: unknown): UpdateVendorInput;
/**
 * Updates a vendor after verifying the caller has event management
 * authority over the vendor's *stored* eventId — never a client-supplied
 * eventId, so a client cannot retarget an edit at a different event's
 * vendor. `id`, `eventId`, `createdBy`, and `createdAt` are carried over
 * from the existing document regardless of what the client sends.
 *
 * @throws ValidationError('vendor_not_found') if the vendor does not exist
 */
export declare function updateVendor(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateVendorInput): Promise<UpdateVendorOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * update.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleUpdateVendor(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateVendorOutput>;
export {};
