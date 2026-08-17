import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { verifyEventManagementAuthority } from '../shared/eventAuthority';
import { getEventMembershipId } from '../shared/membershipIds';
import { validateInvitationRole, validateInvitationSide } from '../invitations/shared';

export interface UpdateMemberRoleInput {
  eventId: string;
  userId: string;
  role: string;
  side?: string;
}

export interface UpdateMemberRoleOutput {
  eventId: string;
  userId: string;
  role: string;
  side: string | null;
}

interface AuthContext {
  uid: string;
}

interface EventMemberData {
  role?: string;
  status?: string;
}

export function validateUpdateMemberRoleInput(input: unknown): UpdateMemberRoleInput {
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

  const role = validateInvitationRole(obj.role);
  const side = validateInvitationSide(obj.side, role);

  return { eventId: obj.eventId, userId: obj.userId, role, side };
}

/**
 * Changes a member's role and/or side. The caller must have an active
 * EventMember with role owner or planner. Reuses the exact role/side
 * vocabulary and validation `createInvitation` already established
 * (`INVITABLE_EVENT_ROLES` excludes `owner`, so a member can never be
 * promoted *to* owner this way, and `validateInvitationSide` already
 * rejects a side on a role that doesn't allow one) rather than
 * duplicating it. The event owner's own role can never be changed here —
 * ownership transfer is a separate, larger decision this pass
 * deliberately does not implement.
 */
export async function updateMemberRole(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: UpdateMemberRoleInput
): Promise<UpdateMemberRoleOutput> {
  await verifyEventManagementAuthority(db, input.eventId, auth.uid);

  const membershipId = getEventMembershipId(input.eventId, input.userId);
  const membershipRef = db.collection('eventMembers').doc(membershipId);
  const snapshot = await membershipRef.get();
  const existing = snapshot.data() as EventMemberData | undefined;

  if (!snapshot.exists || !existing) {
    throw new ValidationError('member_not_found', 'This member could not be found.');
  }

  if (existing.role === 'owner') {
    throw new ValidationError('event_owner_role_immutable', "The event owner's role cannot be changed.");
  }

  const now = new Date().toISOString();
  const side = input.side ?? null;
  await membershipRef.update({ role: input.role, side, updatedAt: now });

  return { eventId: input.eventId, userId: input.userId, role: input.role, side };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize,
 * update.
 */
export async function handleUpdateMemberRole(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<UpdateMemberRoleOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateUpdateMemberRoleInput(data);
  return updateMemberRole(db, { uid: context.auth.uid }, input);
}
