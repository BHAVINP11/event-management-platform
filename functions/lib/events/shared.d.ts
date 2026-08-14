export declare const VALID_EVENT_TYPES: readonly ["wedding", "social", "corporate", "private", "other"];
export interface EventCreationFields {
    name: string;
    type: string;
    description?: string;
    startDate: string;
    endDate?: string;
    timezone: string;
    venueName?: string;
    venueAddress?: string;
}
/**
 * The shape callable functions receive as `context`. Deliberately narrower
 * than `functions.https.CallableContext` so this module — and its tests —
 * never need to import firebase-functions or initialize the Admin SDK.
 */
export interface CallableAuthContext {
    auth?: {
        uid: string;
    } | null;
}
/** Validates the fields common to both creation flows. Throws ValidationError. */
export declare function validateEventCreationFields(obj: Record<string, unknown>): EventCreationFields;
/** Deterministic event membership ID: `${eventId}_${userId}`. */
export declare function getEventMembershipId(eventId: string, userId: string): string;
/**
 * Builds a Firestore event document.
 *
 * `organizationId` is passed explicitly rather than inferred, so callers
 * cannot accidentally create an organization event without deciding to.
 * `status` is always `draft` — the client never chooses the initial status.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export declare function buildEventDocument(eventId: string, userId: string, organizationId: string | null, input: EventCreationFields, now: string): Record<string, unknown>;
/**
 * Builds the creator's EventMember document.
 *
 * The creator is always `owner` / `active` / not invited — the client never
 * chooses its own role or status.
 */
export declare function buildEventMemberDocument(membershipId: string, eventId: string, userId: string, now: string): Record<string, unknown>;
