import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { EventMemberSide, EventRole } from '@/types/membership';
import { MemberError } from '@/lib/appError';

interface RemoveMemberFunctionInput {
  eventId: string;
  userId: string;
}

interface RemoveMemberFunctionOutput {
  eventId: string;
  userId: string;
}

interface UpdateMemberRoleFunctionInput {
  eventId: string;
  userId: string;
  role: EventRole;
  side?: EventMemberSide;
}

interface UpdateMemberRoleFunctionOutput {
  eventId: string;
  userId: string;
  role: EventRole;
  side: EventMemberSide | null;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the details don't look right. Please check and try again.",
  invalid_role: 'Please choose a valid role.',
  invalid_side: 'That side is not valid for this role.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_user_id: "We couldn't identify that member. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow managing members for this event.",
  member_not_found: "We couldn't find that member.",
  event_owner_cannot_be_removed: 'The event owner cannot be removed.',
  event_owner_role_immutable: "The event owner's role cannot be changed.",
  permission_denied: 'You do not have permission to perform this action.',
  internal_error: 'Something went wrong. Please try again.'
};

/**
 * Cloud Functions can only throw a small fixed set of codes — the
 * application's own code travels separately in `error.details.appCode` (see
 * `functions/src/errorMapping.ts`). That's the code this service keys its
 * messaging off of; the standard Firebase code is only a fallback.
 */
const toMemberError = (error: unknown): MemberError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new MemberError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Removes members and changes their role/side through the trusted
 * removeMember/updateMemberRole Cloud Functions, which independently
 * re-verify the caller's role (owner/planner only) and that the target
 * isn't the event owner, regardless of what the UI shows.
 */
export class MemberManagementService {
  async removeMember(eventId: string, userId: string): Promise<void> {
    try {
      const callable = httpsCallable<RemoveMemberFunctionInput, RemoveMemberFunctionOutput>(
        functions,
        'onRemoveMember'
      );
      await callable({ eventId, userId });
    } catch (error) {
      throw toMemberError(error);
    }
  }

  async updateMemberRole(
    eventId: string,
    userId: string,
    role: EventRole,
    side?: EventMemberSide
  ): Promise<void> {
    try {
      const callable = httpsCallable<UpdateMemberRoleFunctionInput, UpdateMemberRoleFunctionOutput>(
        functions,
        'onUpdateMemberRole'
      );
      await callable({ eventId, userId, role, ...(side && { side }) });
    } catch (error) {
      throw toMemberError(error);
    }
  }
}
