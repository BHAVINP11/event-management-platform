import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { getEventMembershipId } from '../shared/membershipIds';

export interface RemoveMemberInput {
  eventId: string;
  userId: string;
}

export interface RemoveMemberOutput {
  eventId: string;
  userId: string;
}

interface AuthContext {
  uid: string;
}

interface EventMemberData {
  role?: string;
  status?: string;
}

export function validateRemoveMemberInput(input: unknown): RemoveMemberInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }
  if (!obj.userId || typeof obj.userId !== 'string') {
    throw new ValidationError('invalid_user_id', 'userId must be a non-empty string.');
  }

  return { eventId: obj.eventId, userId: obj.userId };
}

/**
 * Removes a member from an event. The caller must have an active
 * EventMember with role owner or planner. Removal marks the membership
 * `revoked` rather than deleting the document — Firestore rules already
 * require `status == 'active'` for every event-scoped read, so revocation
 * alone instantly and completely removes the member's access with no rule
 * changes, and preserves the document (and anything referencing the
 * user's ID, like task `assignedTo`) instead of orphaning it. The event
 * owner can never be removed this way — ownership transfer is a separate,
 * larger decision this pass deliberately does not implement.
 */
export async function removeMember(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: RemoveMemberInput
): Promise<RemoveMemberOutput> {
  await verifyEventManagementAuthority(db, input.eventId, auth.uid);

  const membershipId = getEventMembershipId(input.eventId, input.userId);
  const membershipRef = db.collection('eventMembers').doc(membershipId);
  const snapshot = await membershipRef.get();
  const existing = snapshot.data() as EventMemberData | undefined;

  if (!snapshot.exists || !existing) {
    throw new ValidationError('member_not_found', 'This member could not be found.');
  }

  if (existing.role === 'owner') {
    throw new ValidationError('event_owner_cannot_be_removed', 'The event owner cannot be removed.');
  }

  const now = new Date().toISOString();
  await membershipRef.update({ status: 'revoked', updatedAt: now });

  return { eventId: input.eventId, userId: input.userId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * remove.
 */
export async function handleRemoveMember(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<RemoveMemberOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateRemoveMemberInput(data);
  return removeMember(db, { uid: context.auth.uid }, input);
}
