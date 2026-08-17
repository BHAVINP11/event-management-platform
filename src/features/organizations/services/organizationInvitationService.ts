import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { OrganizationInvitationCreationInput } from '@/features/organizations/types/organizationPeople';
import { OrganizationRole } from '@/types/membership';
import { OrganizationError } from '@/lib/appError';

interface CreateOrganizationInvitationFunctionInput extends OrganizationInvitationCreationInput {
  organizationId: string;
}

interface CreateOrganizationInvitationFunctionOutput {
  invitationId: string;
}

interface AcceptOrganizationInvitationFunctionInput {
  invitationId: string;
}

export interface AcceptOrganizationInvitationResult {
  organizationId: string;
  membershipId: string;
}

interface GetOrganizationInvitationPreviewFunctionInput {
  invitationId: string;
}

export interface OrganizationInvitationPreview {
  organizationName: string;
  invitedEmail: string;
  role: OrganizationRole;
}

interface CancelOrganizationInvitationFunctionInput {
  invitationId: string;
}

interface CancelOrganizationInvitationFunctionOutput {
  invitationId: string;
}

interface ResendOrganizationInvitationFunctionInput {
  invitationId: string;
}

interface ResendOrganizationInvitationFunctionOutput {
  invitationId: string;
  expiresAt: string;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the details don't look right. Please check and try again.",
  invalid_email: 'Please enter a valid email address.',
  invalid_role: 'Please choose a valid role.',
  invalid_organization_id: "We couldn't identify the organization. Please try again.",
  invalid_invitation_id: "We couldn't identify the invitation. Please try again.",
  organization_not_found: "We couldn't find this organization.",
  organization_access_denied: "You don't have access to this organization.",
  organization_role_not_allowed: "Your role doesn't allow inviting people to this organization.",
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
const toOrganizationError = (error: unknown): OrganizationError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new OrganizationError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Invites, accepts, previews, cancels, and resends organization
 * invitations through the trusted Cloud Functions. A deliberately
 * separate service from `InvitationService` (event invitations) — see
 * `functions/src/organizations/shared.ts` for why the two domains stay
 * independent. None of this touches a repository directly: creating,
 * accepting, cancelling, and resending are all privileged writes, and
 * the preview is a deliberately narrow read the invitee couldn't
 * otherwise make.
 */
export class OrganizationInvitationService {
  async createInvitation(organizationId: string, input: OrganizationInvitationCreationInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateOrganizationInvitationFunctionInput, CreateOrganizationInvitationFunctionOutput>(
        functions,
        'onCreateOrganizationInvitation'
      );
      const result: HttpsCallableResult<CreateOrganizationInvitationFunctionOutput> = await callable({
        organizationId,
        ...input
      });
      return result.data.invitationId;
    } catch (error) {
      throw toOrganizationError(error);
    }
  }

  async acceptInvitation(invitationId: string): Promise<AcceptOrganizationInvitationResult> {
    try {
      const callable = httpsCallable<AcceptOrganizationInvitationFunctionInput, AcceptOrganizationInvitationResult>(
        functions,
        'onAcceptOrganizationInvitation'
      );
      const result: HttpsCallableResult<AcceptOrganizationInvitationResult> = await callable({ invitationId });
      return result.data;
    } catch (error) {
      throw toOrganizationError(error);
    }
  }

  async getInvitationPreview(invitationId: string): Promise<OrganizationInvitationPreview> {
    try {
      const callable = httpsCallable<GetOrganizationInvitationPreviewFunctionInput, OrganizationInvitationPreview>(
        functions,
        'onGetOrganizationInvitationPreview'
      );
      const result: HttpsCallableResult<OrganizationInvitationPreview> = await callable({ invitationId });
      return result.data;
    } catch (error) {
      throw toOrganizationError(error);
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    try {
      const callable = httpsCallable<CancelOrganizationInvitationFunctionInput, CancelOrganizationInvitationFunctionOutput>(
        functions,
        'onCancelOrganizationInvitation'
      );
      await callable({ invitationId });
    } catch (error) {
      throw toOrganizationError(error);
    }
  }

  /** Extends the invitation's expiry rather than sending a new email — see `functions/src/organizations/resendOrganizationInvitation.ts`. */
  async resendInvitation(invitationId: string): Promise<string> {
    try {
      const callable = httpsCallable<ResendOrganizationInvitationFunctionInput, ResendOrganizationInvitationFunctionOutput>(
        functions,
        'onResendOrganizationInvitation'
      );
      const result: HttpsCallableResult<ResendOrganizationInvitationFunctionOutput> = await callable({ invitationId });
      return result.data.expiresAt;
    } catch (error) {
      throw toOrganizationError(error);
    }
  }
}
