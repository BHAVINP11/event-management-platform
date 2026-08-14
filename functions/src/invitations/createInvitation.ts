import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { getEventMembershipId } from '../shared/membershipIds';
import { CreateInvitationFields, buildInvitationDocument, validateInvitationFields } from './shared';

export interface CreateInvitationInput extends CreateInvitationFields {
  eventId: string;
}

export interface CreateInvitationOutput {
  invitationId: string;
}

interface AuthContext {
  uid: string;
}

/**
 * Event roles allowed to invite people to an event. Granular per-role
 * invitation permissions are a future step — for now, only the two roles
 * capable of creating the event's collaborator list may extend it.
 */
const INVITER_ALLOWED_ROLES = ['owner', 'planner'];

/** How long a new invitation remains acceptable. Not client-configurable. */
const INVITATION_EXPIRY_DAYS = 14;

export function validateCreateInvitationInput(input: unknown): CreateInvitationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.eventId || typeof obj.eventId !== 'string') {
    throw new ValidationError('invalid_event_id', 'eventId must be a non-empty string.');
  }

  const fields = validateInvitationFields(obj);

  return { eventId: obj.eventId, ...fields };
}

/**
 * Verifies the caller may invite people to the given event.
 *
 * Loads the membership by its deterministic ID rather than trusting anything
 * the client asserted about its own access — mirrors
 * `verifyOrganizationEventCreationAccess` in
 * `functions/src/events/createOrganizationEvent.ts`.
 *
 * @throws ValidationError('event_not_found') if the event does not exist
 * @throws ValidationError('event_access_denied') if there is no active membership
 * @throws ValidationError('event_role_not_allowed') if the role cannot invite
 */
export async function verifyInviterAuthority(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  userId: string
): Promise<void> {
  const eventSnapshot = await db.collection('events').doc(eventId).get();
  if (!eventSnapshot.exists) {
    throw new ValidationError('event_not_found', 'Event not found.');
  }

  const membershipId = getEventMembershipId(eventId, userId);
  const membershipSnapshot = await db.collection('eventMembers').doc(membershipId).get();
  const membership = membershipSnapshot.data() as
    | { eventId?: string; status?: string; role?: string }
    | undefined;

  if (
    !membershipSnapshot.exists ||
    !membership ||
    membership.eventId !== eventId ||
    membership.status !== 'active'
  ) {
    throw new ValidationError('event_access_denied', 'You do not have access to this event.');
  }

  if (!membership.role || !INVITER_ALLOWED_ROLES.includes(membership.role)) {
    throw new ValidationError('event_role_not_allowed', 'Your role does not allow inviting people to this event.');
  }
}

/**
 * Rejects a second pending invitation for the same event + email.
 *
 * @throws ValidationError('invitation_already_pending') if one already exists
 */
export async function assertNoDuplicatePendingInvitation(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  invitedEmail: string
): Promise<void> {
  const snapshot = await db
    .collection('invitations')
    .where('eventId', '==', eventId)
    .where('invitedEmail', '==', invitedEmail)
    .where('status', '==', 'pending')
    .get();

  if (!snapshot.empty) {
    throw new ValidationError(
      'invitation_already_pending',
      'There is already a pending invitation for this email.'
    );
  }
}

/**
 * Creates a pending invitation after verifying the caller's authority over
 * the event and that no duplicate pending invitation already exists.
 *
 * Does not create an EventMember — that only happens on acceptance.
 */
export async function createInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: CreateInvitationInput
): Promise<CreateInvitationOutput> {
  const userId = auth.uid;

  await verifyInviterAuthority(db, input.eventId, userId);
  await assertNoDuplicatePendingInvitation(db, input.eventId, input.invitedEmail);

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const invitationRef = db.collection('invitations').doc();
  const invitationId = invitationRef.id;

  await invitationRef.set(buildInvitationDocument(invitationId, input.eventId, userId, input, nowIso, expiresAt));

  return { invitationId };
}

/**
 * Callable-function orchestration: authenticate, validate, authorize, create.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleCreateInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<CreateInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateCreateInvitationInput(data);
  return createInvitation(db, { uid: context.auth.uid }, input);
}
