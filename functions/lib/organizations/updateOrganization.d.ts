import { CallableAuthContext } from '../shared/callableContext';
export interface UpdateOrganizationInput {
    organizationId: string;
    name: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
}
export interface UpdateOrganizationOutput {
    organizationId: string;
}
interface AuthContext {
    uid: string;
}
export declare function validateUpdateOrganizationInput(input: unknown): UpdateOrganizationInput;
/**
 * Updates an organization's name/description/contact details. The caller
 * must have an active OrganizationMember with role owner or admin. Only
 * these existing `Organization` fields are editable — no new fields are
 * introduced. `slug` and `logoUrl` are always carried over unchanged from
 * the existing document (neither has an editing story in this pass: slug
 * is a stable identifier nothing else in the codebase re-validates for
 * uniqueness on edit, and logoUrl has no upload path yet). A full
 * document `.set()` (not a partial `.update()`), matching
 * `updateEvent.ts`'s approach, so omitting `description`/`contactEmail`/
 * `contactPhone` actually clears them rather than leaving stale data.
 */
export declare function updateOrganization(db: FirebaseFirestore.Firestore, auth: AuthContext, input: UpdateOrganizationInput): Promise<UpdateOrganizationOutput>;
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
export declare function handleUpdateOrganization(db: FirebaseFirestore.Firestore, data: unknown, context: CallableAuthContext): Promise<UpdateOrganizationOutput>;
export {};
