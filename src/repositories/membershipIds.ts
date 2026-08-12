/**
 * Firestore document IDs for memberships use the relationship's two stable
 * identifiers, separated by a single underscore. The values are never parsed;
 * this helper is the sole definition shared by repository code.
 */
export const getOrganizationMembershipId = (organizationId: string, userId: string): string =>
  `${organizationId}_${userId}`;

export const getEventMembershipId = (eventId: string, userId: string): string =>
  `${eventId}_${userId}`;
