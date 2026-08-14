import { ValidationError } from '../validation';
import { CallableAuthContext } from '../shared/callableContext';
import { assertInvitationBelongsToCaller, loadAcceptableInvitation } from './acceptInvitation';

export interface GetInvitationPreviewInput {
  invitationId: string;
}

export interface GetInvitationPreviewOutput {
  eventName: string;
  invitedEmail: string;
  role: string;
  side: string | null;
}

interface AuthContext {
  email?: string;
}

/**
 * Read-only projection for the `/invitations/:invitationId` acceptance page.
 *
 * The invitee cannot read `events/{eventId}` directly — Firestore rules only
 * grant that to active event members, and accepting is exactly what makes
 * them one. Rather than widen that read rule (which would expose the full
 * event document — venue, dates, description — to anyone with an invitation
 * link), this callable returns only the event name, gated by the same
 * email-match check `acceptInvitation` uses. "Do not grant access before
 * acceptance" applies to more than just the EventMember write.
 */
export function validateGetInvitationPreviewInput(input: unknown): GetInvitationPreviewInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('invalid_input', 'Input must be an object.');
  }

  const obj = input as Record<string, unknown>;

  if (!obj.invitationId || typeof obj.invitationId !== 'string') {
    throw new ValidationError('invalid_invitation_id', 'invitationId must be a non-empty string.');
  }

  return { invitationId: obj.invitationId };
}

export async function getInvitationPreview(
  db: FirebaseFirestore.Firestore,
  auth: AuthContext,
  input: GetInvitationPreviewInput
): Promise<GetInvitationPreviewOutput> {
  const { data: invitation } = await loadAcceptableInvitation(db, input.invitationId);
  assertInvitationBelongsToCaller(invitation.invitedEmail, auth.email);

  const eventSnapshot = await db.collection('events').doc(invitation.eventId).get();
  const event = eventSnapshot.data() as { name?: string } | undefined;

  if (!eventSnapshot.exists || !event?.name) {
    throw new ValidationError('invitation_not_found', 'Invitation not found.');
  }

  return {
    eventName: event.name,
    invitedEmail: invitation.invitedEmail,
    role: invitation.role,
    side: invitation.side ?? null
  };
}

/**
 * Callable-function orchestration: authenticate, validate, load.
 *
 * Kept independent of `firebase-functions`/`firebase-admin` so it can be unit
 * tested against a fake Firestore without initializing the Admin SDK.
 */
export async function handleGetInvitationPreview(
  db: FirebaseFirestore.Firestore,
  data: unknown,
  context: CallableAuthContext
): Promise<GetInvitationPreviewOutput> {
  if (!context.auth) {
    throw new ValidationError('unauthenticated', 'User must be authenticated.');
  }

  const input = validateGetInvitationPreviewInput(data);
  return getInvitationPreview(db, { email: context.auth.token?.email }, input);
}
