export declare const GUEST_SIDES: readonly ["bride", "groom", "both"];
export declare const GUEST_STATUSES: readonly ["pending", "invited", "confirmed", "declined"];
export interface GuestFields {
    name: string;
    phone?: string;
    email?: string;
    side: string;
    relation?: string;
    notes?: string;
    status: string;
}
/** Validates the fields common to guest creation and editing. Throws ValidationError. */
export declare function validateGuestFields(obj: Record<string, unknown>): GuestFields;
/**
 * Builds a Firestore guest document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createGuest passes the
 * authenticated uid and "now"; updateGuest passes the existing document's
 * values, so an edit can never change who created a guest or when. Optional
 * fields are omitted rather than stored as `undefined`.
 */
export declare function buildGuestDocument(guestId: string, eventId: string, createdBy: string, fields: GuestFields, createdAt: string, updatedAt: string): Record<string, unknown>;
