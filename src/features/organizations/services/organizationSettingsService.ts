import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { OrganizationError } from '@/lib/appError';

interface UpdateOrganizationFunctionInput {
  organizationId: string;
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface UpdateOrganizationFunctionOutput {
  organizationId: string;
}

export interface OrganizationSettingsFormInput {
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the organization's details don't look right. Please check and try again.",
  invalid_name: 'Please enter a valid organization name.',
  invalid_description: 'Please shorten the description.',
  invalid_email: 'Please enter a valid contact email.',
  invalid_phone: 'Please enter a valid contact phone number.',
  invalid_organization_id: "We couldn't identify the organization. Please try again.",
  organization_not_found: "We couldn't find this organization.",
  organization_access_denied: "You don't have access to this organization.",
  organization_role_not_allowed: "Your role doesn't allow editing this organization.",
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
 * Edits an organization's name/description/contact details through the
 * trusted `updateOrganization` Cloud Function, which independently
 * re-verifies the caller's role (owner/admin only).
 */
export class OrganizationSettingsService {
  async updateOrganization(organizationId: string, input: OrganizationSettingsFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateOrganizationFunctionInput, UpdateOrganizationFunctionOutput>(
        functions,
        'onUpdateOrganization'
      );
      await callable({ organizationId, ...input });
    } catch (error) {
      throw toOrganizationError(error);
    }
  }
}
