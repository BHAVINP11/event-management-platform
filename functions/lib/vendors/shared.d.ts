export declare const VENDOR_CATEGORIES: readonly ["venue", "catering", "decoration", "photography", "videography", "entertainment", "transportation", "accommodation", "jewellery", "makeup", "invitation", "other"];
export declare const VENDOR_STATUSES: readonly ["enquiry", "shortlisted", "confirmed", "cancelled"];
export interface VendorFields {
    name: string;
    category: string;
    phone?: string;
    email?: string;
    notes?: string;
    status: string;
}
/** Validates the fields common to vendor creation and editing. Throws ValidationError. */
export declare function validateVendorFields(obj: Record<string, unknown>): VendorFields;
/**
 * Builds a Firestore vendor document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createVendor passes
 * the authenticated uid and "now"; updateVendor passes the existing
 * document's values, so an edit can never change who created it or when.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export declare function buildVendorDocument(vendorId: string, eventId: string, createdBy: string, fields: VendorFields, createdAt: string, updatedAt: string): Record<string, unknown>;
