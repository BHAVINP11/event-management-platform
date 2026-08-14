import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { InvitationCreationInput } from '@/features/events/types/people';
import { EventMemberSide, EventRole } from '@/types/membership';
import { InvitationError } from '@/lib/appError';

interface CreateInvitationFunctionInput extends InvitationCreationInput {
  eventId: string;
}

interface CreateInvitationFunctionOutput {
  invitationId: string;
}

interface AcceptInvitationFunctionInput {
  invitationId: string;
}

export interface AcceptInvitationResult {
  eventId: string;
  membershipId: string;
}

interface GetInvitationPreviewFunctionInput {
  invitationId: string;
}

export interface InvitationPreview {
  eventName: string;
  invitedEmail: string;
  role: EventRole;
  side: EventMemberSide | null;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the details don't look right. Please check and try again.",
  invalid_email: 'Please enter a valid email address.',
  invalid_role: 'Please choose a valid role.',
  invalid_side: 'That side is not valid for this role.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_invitation_id: "We couldn't identify the invitation. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow inviting people to this event.",
  invitation_already_pending: 'There is already a pending invitation for this email.',
  invitation_not_found: "We couldn't find this invitation.",
  invitation_not_pending: 'This invitation is no longer available.',
  invitation_expired: 'This invitation has expired.',
  invitation_email_mismatch: 'This invitation was sent to a different email address.',
  conflict: 'This already exists.',
  permission_denied: 'You do not have permission to perform this action.',
  internal_error: 'Something went wrong. Please try again.'
};

/**
 * Cloud Functions can only throw a small fixed set of codes — the
 * application's own code travels separately in `error.details.appCode` (see
 * `functions/src/errorMapping.ts`). That's the code this service keys its
 * messaging off of; the standard Firebase code is only a fallback.
 */
const toInvitationError = (error: unknown): InvitationError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new InvitationError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Invites, accepts, and previews invitations through the trusted Cloud
 * Functions. None of this touches a repository directly: creating and
 * accepting are privileged writes, and the preview is a deliberately narrow
 * read the invitee couldn't otherwise make (see
 * `functions/src/invitations/getInvitationPreview.ts`).
 */
export class InvitationService {
  async createInvitation(eventId: string, input: InvitationCreationInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateInvitationFunctionInput, CreateInvitationFunctionOutput>(
        functions,
        'onCreateInvitation'
      );
      const result: HttpsCallableResult<CreateInvitationFunctionOutput> = await callable({ eventId, ...input });
      return result.data.invitationId;
    } catch (error) {
      throw toInvitationError(error);
    }
  }

  async acceptInvitation(invitationId: string): Promise<AcceptInvitationResult> {
    try {
      const callable = httpsCallable<AcceptInvitationFunctionInput, AcceptInvitationResult>(
        functions,
        'onAcceptInvitation'
      );
      const result: HttpsCallableResult<AcceptInvitationResult> = await callable({ invitationId });
      return result.data;
    } catch (error) {
      throw toInvitationError(error);
    }
  }

  async getInvitationPreview(invitationId: string): Promise<InvitationPreview> {
    try {
      const callable = httpsCallable<GetInvitationPreviewFunctionInput, InvitationPreview>(
        functions,
        'onGetInvitationPreview'
      );
      const result: HttpsCallableResult<InvitationPreview> = await callable({ invitationId });
      return result.data;
    } catch (error) {
      throw toInvitationError(error);
    }
  }
}
