"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateOrganizationEventInput = validateCreateOrganizationEventInput;
exports.verifyOrganizationEventCreationAccess = verifyOrganizationEventCreationAccess;
exports.createOrganizationEvent = createOrganizationEvent;
exports.handleCreateOrganizationEvent = handleCreateOrganizationEvent;
const validation_1 = require("../validation");
const membershipIds_1 = require("../shared/membershipIds");
const shared_1 = require("./shared");
/**
 * Organization roles allowed to create events on behalf of an organization.
 * Matches the roles the client offers a "Create Event" entry point for
 * (src/features/auth/services/authorizationService.ts) — the client button is
 * a convenience, this list is the actual authority.
 */
const ALLOWED_ORGANIZATION_EVENT_CREATION_ROLES = ['owner', 'admin', 'planner'];
/**
 * Validate the input for createOrganizationEvent.
 * Throws ValidationError if any field is invalid.
 */
function validateCreateOrganizationEventInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.organizationId || typeof obj.organizationId !== 'string') {
        throw new validation_1.ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
    }
    const fields = (0, shared_1.validateEventCreationFields)(obj);
    return { organizationId: obj.organizationId, ...fields };
}
/**
 * Verifies the caller may create events for the given organization.
 *
 * Loads the membership by its deterministic ID rather than trusting anything
 * the client asserted about its own access, and never trusts a role or
 * status passed from the browser — only the stored membership document.
 *
 * @throws ValidationError('organization_not_found') if the organization does not exist
 * @throws ValidationError('organization_access_denied') if there is no active membership
 * @throws ValidationError('organization_role_not_allowed') if the role cannot create events
 */
async function verifyOrganizationEventCreationAccess(db, organizationId, userId) {
    const organizationSnapshot = await db.collection('organizations').doc(organizationId).get();
    if (!organizationSnapshot.exists) {
        throw new validation_1.ValidationError('organization_not_found', 'Organization not found.');
    }
    const membershipId = (0, membershipIds_1.getOrganizationMembershipId)(organizationId, userId);
    const membershipSnapshot = await db.collection('organizationMembers').doc(membershipId).get();
    const membership = membershipSnapshot.data();
    // The deterministic ID already ties the membership document to this
    // organization; the field is checked too rather than trusted implicitly,
    // matching how firestore.rules independently verifies the same field.
    if (!membershipSnapshot.exists ||
        !membership ||
        membership.organizationId !== organizationId ||
        membership.status !== 'active') {
        throw new validation_1.ValidationError('organization_access_denied', 'You do not have access to this organization.');
    }
    if (!membership.role || !ALLOWED_ORGANIZATION_EVENT_CREATION_ROLES.includes(membership.role)) {
        throw new validation_1.ValidationError('organization_role_not_allowed', 'Your role does not allow creating events for this organization.');
    }
}
/**
 * Atomically create an organization event and its owner membership, after
 * verifying the caller has an active, event-creation-capable membership in
 * that organization.
 *
 * @throws ValidationError if the caller lacks organization access
 * @throws Error if the Firestore transaction fails
 */
async function createOrganizationEvent(db, auth, input) {
    const userId = auth.uid;
    await verifyOrganizationEventCreationAccess(db, input.organizationId, userId);
    const now = new Date().toISOString();
    const eventRef = db.collection('events').doc();
    const eventId = eventRef.id;
    const membershipId = (0, shared_1.getEventMembershipId)(eventId, userId);
    const membershipRef = db.collection('eventMembers').doc(membershipId);
    const batch = db.batch();
    batch.set(eventRef, (0, shared_1.buildEventDocument)(eventId, userId, input.organizationId, input, now));
    batch.set(membershipRef, (0, shared_1.buildEventMemberDocument)(membershipId, eventId, userId, now));
    await batch.commit();
    return { eventId, membershipId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
async function handleCreateOrganizationEvent(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateCreateOrganizationEventInput(data);
    return createOrganizationEvent(db, { uid: context.auth.uid }, input);
}
