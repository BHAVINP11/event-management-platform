import { CallableAuthContext } from '../shared/callableContext';
export interface DeleteVendorInput {
    vendorId: string;
}
export interface DeleteVendorOutput {
    vendorId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateDeleteVendorInput(input: unknown): DeleteVendorInput;
/**
 * Deletes a vendor after verifying the caller has event management
 * authority over the vendor's *stored* eventId — never a client-supplied
 * value.
 *
 * @throws ValidationError('vendor_not_found') if the vendor does not exist
 */
export declare function deleteVendor(db: FirebaseFirestore.Firestore, auth: AuthContext, input: DeleteVendorInput): Promise<DeleteVendorOutput>;
/**
 * Callable-function orchestration: authenticate, validate, load, authorize,
 * delete.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleDeleteVendor(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<DeleteVendorOutput>;
export {};
