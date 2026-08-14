import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { getEventMembershipId } from '../shared/membershipIds';

export interface AcceptInvitationInput {
  invitationId: string;
}

export interface AcceptInvitationOutput {
  eventId: string;
  membershipId: string;
}

interface AuthContext {
  uid: string;
  email?: string;
}

interface InvitationData {
  eventId?: string;
  invitedEmail?: string;
  role?: string;
  side?: string | null;
  status?: string;
  invitedBy?: string;
  expiresAt?: string;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export function validateAcceptInvitationInput(input: unknown): AcceptInvitationInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.invitationId || typeof obj.invitationId !== 'string') {
    throw new ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
  }

  return { invitationId: obj.invitationId };
}

/**
 * Loads an invitation and checks it is acceptable: exists, pending, not
 * expired. Shared by acceptInvitation and getInvitationPreview so the two
 * can never disagree about what "acceptable" means.
 *
 * @throws ValidationError('invitation_not_found')
 * @throws ValidationError('invitation_not_pending')
 * @throws ValidationError('invitation_expired')
 */
export async function loadAcceptableInvitation(
  db: FirebaseFirestore.Firestore,
  invitationId: string
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: Required<Pick<InvitationData, 'eventId' | 'invitedEmail' | 'role'>> & InvitationData }> {
  const ref = db.collection('invitations').doc(invitationId);
  const snapshot = await ref.get();
  const data = snapshot.data() as InvitationData | undefined;

  if (!snapshot.exists || !data || !data.eventId || !data.invitedEmail || !data.role) {
    throw new ValidationError('invitation_not_found', 'Invitation not found.');
  }

  if (data.status !== 'pending') {
    throw new ValidationError('invitation_not_pending', 'This invitation is no longer pending.');
  }

  if (!data.expiresAt || new Date(data.expiresAt).getTime() < Date.now()) {
    throw new ValidationError('invitation_expired', 'This invitation has expired.');
  }

  return { ref, data: data as Required<Pick<InvitationData, 'eventId' | 'invitedEmail' | 'role'>> & InvitationData };
}

/**
 * Verifies the authenticated caller is the person the invitation was sent
 * to. Comparison is case-insensitive since the invited email was normalized
 * to lowercase at creation time.
 *
 * @throws ValidationError('invitation_email_mismatch')
 */
export function assertInvitationBelongsToCaller(invitedEmail: string, callerEmail: string | undefined): void {
  if (!callerEmail || normalizeEmail(callerEmail) !== normalizeEmail(invitedEmail)) {
    throw new ValidationError(
      'invitation_email_mismatch',
      'This invitation was sent to a different email address.'
    );
  }
}

/**
 * Accepts an invitation: verifies it, creates the deterministic EventMember
 * (or reactivates one belonging to the same event+user), and marks the
 * invitation accepted — atomically.
 *
 * If an active membership already exists for this event+user (e.g. a race
 * between two acceptances of the same invitation), it is left untouched
 * rather than overwritten; only the invitation is marked accepted.
 */
export async function acceptInvitation(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: AcceptInvitationInput
): Promise<AcceptInvitationOutput> {
  const userId = auth.uid;

  const { ref: invitationRef, data: invitation } = await loadAcceptableInvitation(db, input.invitationId);
  assertInvitationBelongsToCaller(invitation.invitedEmail, auth.email);

  const membershipId = getEventMembershipId(invitation.eventId, userId);
  const membershipRef = db.collection('eventMembers').doc(membershipId);
  const existingMembershipSnapshot = await membershipRef.get();
  const existingMembership = existingMembershipSnapshot.data() as { status?: string } | undefined;

  const now = new Date().toISOString();

  if (existingMembershipSnapshot.exists && existingMembership?.status === 'active') {
    // Already an active member — do not overwrite. Just record acceptance.
    await invitationRef.update({ status: 'accepted', updatedAt: now });
    return { eventId: invitation.eventId, membershipId };
  }

  const batch = db.batch();
  batch.set(membershipRef, {
    id: membershipId,
    eventId: invitation.eventId,
    userId,
    role: invitation.role,
    side: invitation.side ?? null,
    status: 'active',
    invitedBy: invitation.invitedBy ?? null,
    createdAt: now,
    updatedAt: now
  });
  batch.update(invitationRef, { status: 'accepted', updatedAt: now });
  await batch.commit();

  return { eventId: invitation.eventId, membershipId };
}

/**
 * Callable-function orchestration: authenticate, validate, accept.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleAcceptInvitation(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<AcceptInvitationOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateAcceptInvitationInput(data);
  return acceptInvitation(db, { uid: context.auth.uid, email: context.auth.token?.email }, input);
}
