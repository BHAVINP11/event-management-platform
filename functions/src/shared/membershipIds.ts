/**
 * Deterministic Firestore membership IDs, shared by onboarding and event
 * creation so neither can drift from the other's convention:
 *
 *   organizationMembers/{organizationId}_{userId}
 *   eventMembers/{eventId}_{userId}
 *
 * This is the Cloud Functions counterpart to the client's
 * src/repositories/membershipIds.ts — the two are intentionally separate
 * files (client and Admin SDK code are not bundled together) but must stay
 * byte-for-byte the same convention.
 */

export function getOrganizationMembershipId(organizationId: string, userId: string): string {
  return `${organizationId}_${userId}`;
}

export function getEventMembershipId(eventId: string, userId: string): string {
  return `${eventId}_${userId}`;
}
