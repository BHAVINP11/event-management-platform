"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationMembershipId = void 0;
exports.validateCreateOrganizationInput = validateCreateOrganizationInput;
exports.buildOrganizationDocument = buildOrganizationDocument;
exports.buildOrganizationMemberDocument = buildOrganizationMemberDocument;
exports.isSlugTaken = isSlugTaken;
exports.createOrganization = createOrganization;
const validation_1 = require("../validation");
const membershipIds_1 = require("../shared/membershipIds");
Object.defineProperty(exports, "getOrganizationMembershipId", { enumerable: true, get: function () { return membershipIds_1.getOrganizationMembershipId; } });
/**
 * Validate the input for createOrganization.
 * Throws ValidationError if any field is invalid.
 */
function validateCreateOrganizationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new validation_1.ValidationError('invalid_input', 'Input must be an object.');
    }
    const obj = input;
    (0, validation_1.validateOrganizationName)(obj.name);
    (0, validation_1.validateOrganizationDescription)(obj.description);
    (0, validation_1.validateContactEmail)(obj.contactEmail);
    (0, validation_1.validateContactPhone)(obj.contactPhone);
    const normalizedSlug = (0, validation_1.normalizeAndValidateSlug)(obj.slug);
    return {
        name: obj.name,
        slug: normalizedSlug,
        description: obj.description,
        contactEmail: obj.contactEmail,
        contactPhone: obj.contactPhone
    };
}
/**
 * Build a Firestore organization document.
 * Optional fields are omitted when not provided (not stored as undefined).
 */
function buildOrganizationDocument(organizationId, input, now) {
    const doc = {
        id: organizationId,
        name: input.name,
        slug: input.slug,
        createdAt: now,
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
    return doc;
}
/**
 * Build a Firestore organization member document.
 */
function buildOrganizationMemberDocument(membershipId, organizationId, userId, now) {
    return {
        id: membershipId,
        organizationId,
        userId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now
    };
}
/**
 * Check if an organization slug already exists.
 *
 * Query organizations by slug and return true if any match.
 * This is a simple linear search; for production, consider
 * a dedicated slug index or hash.
 */
async function isSlugTaken(db, slug) {
    const snapshot = await db
        .collection('organizations')
        .where('slug', '==', slug)
        .limit(1)
        .get();
    return !snapshot.empty;
}
/**
 * Atomically create an organization and its owner membership.
 *
 * @param db Firestore database instance (from Admin SDK)
 * @param auth Authentication context with uid
 * @param input Validated input payload
 * @returns Created organization ID and membership ID
 *
 * @throws ValidationError if slug is already taken
 * @throws Error if Firestore transaction fails
 */
async function createOrganization(db, auth, input) {
    const userId = auth.uid;
    const now = new Date().toISOString();
    // Check for duplicate slug
    const slugTaken = await isSlugTaken(db, input.slug);
    if (slugTaken) {
        throw new validation_1.ValidationError('organization_slug_taken', 'This organization slug is already taken.');
    }
    // Generate organization ID (Firestore will auto-generate)
    const organizationRef = db.collection('organizations').doc();
    const organizationId = organizationRef.id;
    // Build membership ID (deterministic)
    const membershipId = (0, membershipIds_1.getOrganizationMembershipId)(organizationId, userId);
    const membershipRef = db.collection('organizationMembers').doc(membershipId);
    // Execute atomically
    const batch = db.batch();
    batch.set(organizationRef, buildOrganizationDocument(organizationId, input, now));
    batch.set(membershipRef, buildOrganizationMemberDocument(membershipId, organizationId, userId, now));
    await batch.commit();
    return {
        organizationId,
        membershipId
    };
}
