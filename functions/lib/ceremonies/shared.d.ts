export declare const CEREMONY_STATUSES: readonly ["planned", "confirmed", "completed", "cancelled"];
export interface CeremonyFields {
    name: string;
    description?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    venue?: string;
    notes?: string;
    status: string;
}
/** Validates the fields common to creating and editing a function/ceremony. Throws ValidationError. */
export declare function validateCeremonyFields(obj: Record<string, unknown>): CeremonyFields;
/**
 * Builds a Firestore function/ceremony document.
 *
 * `eventId`, `createdBy`, and `createdAt` are passed explicitly by the
 * caller rather than read from the client payload — createFunction passes
 * the authenticated uid and "now"; updateFunction passes the existing
 * document's values, so an edit can never change who created it or when.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export declare function buildCeremonyDocument(ceremonyId: string, eventId: string, createdBy: string, fields: CeremonyFields, createdAt: string, updatedAt: string): Record<string, unknown>;
