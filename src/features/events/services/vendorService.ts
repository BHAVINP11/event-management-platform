import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { VendorRepository } from '@/repositories/interfaces/vendorRepository';
import { VendorFormInput, VendorListAccessResult } from '@/features/events/types/vendors';
import { EventRole } from '@/types/membership';
import { EventLoadError, VendorError } from '@/lib/appError';

interface CreateVendorCallableInput extends VendorFormInput {
  eventId: string;
}

interface CreateVendorCallableOutput {
  vendorId: string;
}

interface UpdateVendorCallableInput extends VendorFormInput {
  vendorId: string;
}

interface DeleteVendorCallableInput {
  vendorId: string;
}

const MANAGEMENT_ROLES: readonly EventRole[] = [EventRole.Owner, EventRole.Planner];

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the vendor's details don't look right. Please check and try again.",
  invalid_name: 'Please enter a valid name.',
  invalid_category: 'Please choose a valid category.',
  invalid_phone: 'Please enter a valid phone number.',
  invalid_email: 'Please enter a valid email address.',
  invalid_notes: 'Please shorten the notes.',
  invalid_status: 'Please choose a valid status.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_vendor_id: "We couldn't identify the vendor. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow managing vendors for this event.",
  vendor_not_found: "We couldn't find this vendor.",
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
const toVendorError = (error: unknown): VendorError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new VendorError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Reads the vendor list through the repository/Firestore-rules boundary;
 * writes go exclusively through the trusted createVendor/updateVendor/
 * deleteVendor Cloud Functions, which independently re-verify the
 * caller's role (owner/planner only) regardless of what this service or
 * the UI show.
 *
 * Like Functions/Ceremonies and Expenses, there is no side-scoping here —
 * every active event member sees every vendor; only who may *manage*
 * them differs.
 */
export class VendorService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly vendorRepository: VendorRepository
  ) {}

  async listVendors(userId: string, eventId: string): Promise<VendorListAccessResult> {
    if (!userId || !eventId) {
      return { status: 'denied' };
    }

    const access = await this.authorizationService.canAccessEvent(userId, eventId);

    if (!access.allowed) {
      if (access.reason === 'infrastructure_error') {
        throw new EventLoadError();
      }
      return { status: 'denied' };
    }

    try {
      const event = await this.eventRepository.getById(eventId);
      if (!event) {
        return { status: 'notFound' };
      }

      const membership = await this.authorizationService.getEventMembership(userId, eventId);
      const vendors = await this.vendorRepository.listByEvent(eventId);

      return {
        status: 'allowed',
        data: {
          vendors,
          canManage: Boolean(membership && MANAGEMENT_ROLES.includes(membership.role))
        }
      };
    } catch {
      throw new EventLoadError();
    }
  }

  async createVendor(eventId: string, input: VendorFormInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateVendorCallableInput, CreateVendorCallableOutput>(
        functions,
        'onCreateVendor'
      );
      const result: HttpsCallableResult<CreateVendorCallableOutput> = await callable({ eventId, ...input });
      return result.data.vendorId;
    } catch (error) {
      throw toVendorError(error);
    }
  }

  async updateVendor(vendorId: string, input: VendorFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateVendorCallableInput, { vendorId: string }>(
        functions,
        'onUpdateVendor'
      );
      await callable({ vendorId, ...input });
    } catch (error) {
      throw toVendorError(error);
    }
  }

  async deleteVendor(vendorId: string): Promise<void> {
    try {
      const callable = httpsCallable<DeleteVendorCallableInput, { vendorId: string }>(
        functions,
        'onDeleteVendor'
      );
      await callable({ vendorId });
    } catch (error) {
      throw toVendorError(error);
    }
  }
}
