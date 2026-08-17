import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { OrganizationRole } from '@/types/membership';
import { OrganizationError } from '@/lib/appError';

interface RemoveOrganizationMemberFunctionInput {
  organizationId: string;
  userId: string;
}

interface RemoveOrganizationMemberFunctionOutput {
  organizationId: string;
  userId: string;
}

interface UpdateOrganizationMemberRoleFunctionInput {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

interface UpdateOrganizationMemberRoleFunctionOutput {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the details don't look right. Please check and try again.",
  invalid_role: 'Please choose a valid role.',
  invalid_organization_id: "We couldn't identify the organization. Please try again.",
  invalid_user_id: "We couldn't identify that member. Please try again.",
  organization_not_found: "We couldn't find this organization.",
  organization_access_denied: "You don't have access to this organization.",
  organization_role_not_allowed: "Your role doesn't allow managing members for this organization.",
  organization_member_not_found: "We couldn't find that member.",
  organization_owner_cannot_be_removed: 'The organization owner cannot be removed.',
  organization_owner_role_immutable: "The organization owner's role cannot be changed.",
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
 * Removes members and changes their role through the trusted
 * removeOrganizationMember/updateOrganizationMemberRole Cloud Functions,
 * which independently re-verify the caller's role (owner/admin only) and
 * that the target isn't the organization owner, regardless of what the
 * UI shows.
 */
export class OrganizationMemberManagementService {
  async removeMember(organizationId: string, userId: string): Promise<void> {
    try {
      const callable = httpsCallable<RemoveOrganizationMemberFunctionInput, RemoveOrganizationMemberFunctionOutput>(
        functions,
        'onRemoveOrganizationMember'
      );
      await callable({ organizationId, userId });
    } catch (error) {
      throw toOrganizationError(error);
    }
  }

  async updateMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
    try {
      const callable = httpsCallable<
        UpdateOrganizationMemberRoleFunctionInput,
        UpdateOrganizationMemberRoleFunctionOutput
      >(functions, 'onUpdateOrganizationMemberRole');
      await callable({ organizationId, userId, role });
    } catch (error) {
      throw toOrganizationError(error);
    }
  }
}
