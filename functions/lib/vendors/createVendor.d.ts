import { CallableAuthContext } from '../shared/callableContext';
import { VendorFields } from './shared';
export interface CreateVendorInput extends VendorFields {
    eventId: string;
}
export interface CreateVendorOutput {
    vendorId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateCreateVendorInput(input: unknown): CreateVendorInput;
/**
 * Creates a vendor after verifying the caller has event management
 * authority (owner/planner only). The client never chooses `id`,
 * `createdBy`, or the timestamps.
 */
export declare function createVendor(db: FirebaseFirestore.Firestore, auth: AuthContext, input: CreateVendorInput): Promise<CreateVendorOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export declare function handleCreateVendor(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<CreateVendorOutput>;
export {};
