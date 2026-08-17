"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateOrganizationInput = validateUpdateOrganizationInput;
exports.updateOrganization = updateOrganization;
exports.handleUpdateOrganization = handleUpdateOrganization;
const validation_1 = require("../validation");
const organizationAuthority_1 = require("../shared/organizationAuthority");
function validateUpdateOrganizationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    if (!obj.organizationId || typeof obj.organizationId !== 'string') {
        throw new validation_1.ValidationError('invalid_organization_id', 'organizationId must be a non-empty string.');
    }
    (0, validation_1.validateOrganizationName)(obj.name);
    (0, validation_1.validateOrganizationDescription)(obj.description);
    (0, validation_1.validateContactEmail)(obj.contactEmail);
    (0, validation_1.validateContactPhone)(obj.contactPhone);
    return {
        organizationId: obj.organizationId,
        name: obj.name,
        description: obj.description,
        contactEmail: obj.contactEmail,
        contactPhone: obj.contactPhone
    };
}
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
async function updateOrganization(db, auth, input) {
    await (0, organizationAuthority_1.verifyOrganizationManagementAuthority)(db, input.organizationId, auth.uid);
    const organizationRef = db.collection('organizations').doc(input.organizationId);
    const snapshot = await organizationRef.get();
    const existing = snapshot.data();
    if (!snapshot.exists || !existing) {
        throw new validation_1.ValidationError('organization_not_found', 'Organization not found.');
    }
    const now = new Date().toISOString();
    const doc = {
        id: input.organizationId,
        name: input.name,
        slug: existing.slug,
        createdAt: existing.createdAt,
        updatedAt: now
    };
    if (input.description !== undefined) {
        doc.description = input.description;
    }
    if (input.contactEmail !== undefined) {
        doc.contactEmail = input.contactEmail;
    }
    if (input.contactPhone !== undefined) {
        doc.contactPhone = input.contactPhone;
    }
    if (existing.logoUrl !== undefined) {
        doc.logoUrl = existing.logoUrl;
    }
    await organizationRef.set(doc);
    return { organizationId: input.organizationId };
}
/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
async function handleUpdateOrganization(db, data, context) {
    if (!context.auth) {
        throw new validation_1.ValidationError('unauthenticated', 'User must be authenticated.');
    }
    const input = validateUpdateOrganizationInput(data);
    return updateOrganization(db, { uid: context.auth.uid }, input);
}
