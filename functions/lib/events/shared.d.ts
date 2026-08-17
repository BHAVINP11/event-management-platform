import { getEventMembershipId } from '../shared/membershipIds';
import { CallableAuthContext } from '../shared/callableContext';
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
export { CallableAuthContext };
/** Validates the fields common to both creation flows. Throws ValidationError. */
export declare function validateEventCreationFields(obj: Record<string, unknown>): EventCreationFields;
export { getEventMembershipId };
/**
 * Builds a Firestore event document.
 *
 * `organizationId` is passed explicitly rather than inferred, so callers
 * cannot accidentally create an organization event without deciding to.
 * `status` is always `draft` — the client never chooses the initial status.
 * Optional fields are omitted rather than stored as `undefined`.
 */
export declare function buildEventDocument(eventId: string, userId: string, organizationId: string | null, input: EventCreationFields, now: string): Record<string, unknown>;
export declare const VALID_EVENT_STATUSES: readonly ["draft", "active", "completed", "archived"];
export interface EventEditFields extends EventCreationFields {
    status: string;
}
/** Validates the fields common to full event edits — the creation fields plus status. */
export declare function validateEventEditFields(obj: Record<string, unknown>): EventEditFields;
/**
 * Builds the full replacement Event document for an edit (name/type/
 * description/dates/timezone/venue/status). A full `.set()`, not a
 * partial `.update()` — matching `buildGuestDocument`'s approach — so
 * clearing an optional field (e.g. removing a venue) actually removes it
 * rather than leaving stale data, with no `FieldValue.delete()` sentinel
 * needed. `budgetAmount` and `coverImageUrl` are never touched here —
 * they have their own dedicated update functions — so the caller must
 * pass through whatever the existing document already has for both.
 */
export declare function buildEventUpdateDocument(eventId: string, createdBy: string, organizationId: string | null, input: EventEditFields, createdAt: string, now: string, existing: {
    budgetAmount?: number;
    coverImageUrl?: string | null;
}): Record<string, unknown>;
/**
 * Builds the creator's EventMember document.
 *
 * The creator is always `owner` / `active` / not invited — the client never
 * chooses its own role or status.
 */
export declare function buildEventMemberDocument(membershipId: string, eventId: string, userId: string, now: string): Record<string, unknown>;
