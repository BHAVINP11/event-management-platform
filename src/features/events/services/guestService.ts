import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { GuestRepository } from '@/repositories/interfaces/guestRepository';
import { GuestFormInput, GuestListAccessResult, computeGuestCounts } from '@/features/events/types/guests';
import { canManageGuests, manageableGuestSides } from '@/features/events/services/guestAuthorization';
import { EventMember, EventMemberSide, EventRole } from '@/types/membership';
import { Guest, GuestSide } from '@/types/guest';
import { EventLoadError, GuestError } from '@/lib/appError';

interface CreateGuestFunctionInput extends GuestFormInput {
  eventId: string;
}

interface CreateGuestFunctionOutput {
  guestId: string;
}

interface UpdateGuestFunctionInput extends GuestFormInput {
  guestId: string;
}

interface DeleteGuestFunctionInput {
  guestId: string;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the guest's details don't look right. Please check and try again.",
  invalid_name: 'Please enter a valid name.',
  invalid_phone: 'Please enter a valid phone number.',
  invalid_email: 'Please enter a valid email address.',
  invalid_side: 'Please choose a valid side.',
  invalid_status: 'Please choose a valid status.',
  invalid_relation: 'Please enter a valid relation.',
  invalid_notes: 'Please shorten the notes.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_guest_id: "We couldn't identify the guest. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow managing guests for this event.",
  guest_not_found: "We couldn't find this guest.",
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
const toGuestError = (error: unknown): GuestError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new GuestError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Reads the guest list through the repository/Firestore-rules boundary;
 * writes go exclusively through the trusted createGuest/updateGuest/
 * deleteGuest Cloud Functions, which independently re-verify the caller's
 * scope (owner/planner/couple, side-checked for couple) regardless of what
 * this service or the UI show.
 *
 * Reads are scoped to what the caller may actually see: a couple member
 * (bride/groom) only ever fetches their own side plus "both" — two
 * `listByEventAndSide` reads instead of one `listByEvent`, so the Firestore
 * rule can verify the query itself is scoped (see firestore.rules) rather
 * than trusting this class to filter after the fact. Owner/planner/family/
 * staff/viewer still get the single unfiltered read.
 */
export class GuestService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly guestRepository: GuestRepository
  ) {}

  async listGuests(userId: string, eventId: string): Promise<GuestListAccessResult> {
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
      const guests = membership ? await this.loadScopedGuests(eventId, membership) : [];

      return {
        status: 'allowed',
        data: {
          guests,
          counts: computeGuestCounts(guests),
          canManage: Boolean(membership && canManageGuests(membership)),
          manageableSides: membership ? manageableGuestSides(membership) : []
        }
      };
    } catch {
      throw new EventLoadError();
    }
  }

  /**
   * A couple member is scoped to their own side + "both"; every other role
   * (owner/planner/family/staff/viewer) sees every guest for this step.
   */
  private async loadScopedGuests(eventId: string, membership: EventMember): Promise<Guest[]> {
    if (membership.role !== EventRole.Couple) {
      return this.guestRepository.listByEvent(eventId);
    }

    if (membership.side === EventMemberSide.Bride) {
      const [bride, both] = await Promise.all([
        this.guestRepository.listByEventAndSide(eventId, GuestSide.Bride),
        this.guestRepository.listByEventAndSide(eventId, GuestSide.Both)
      ]);
      return [...bride, ...both];
    }

    if (membership.side === EventMemberSide.Groom) {
      const [groom, both] = await Promise.all([
        this.guestRepository.listByEventAndSide(eventId, GuestSide.Groom),
        this.guestRepository.listByEventAndSide(eventId, GuestSide.Both)
      ]);
      return [...groom, ...both];
    }

    // A couple member with no side on record (shouldn't happen in
    // practice) sees nothing rather than everything.
    return [];
  }

  async createGuest(eventId: string, input: GuestFormInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateGuestFunctionInput, CreateGuestFunctionOutput>(
        functions,
        'onCreateGuest'
      );
      const result: HttpsCallableResult<CreateGuestFunctionOutput> = await callable({ eventId, ...input });
      return result.data.guestId;
    } catch (error) {
      throw toGuestError(error);
    }
  }

  async updateGuest(guestId: string, input: GuestFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateGuestFunctionInput, { guestId: string }>(functions, 'onUpdateGuest');
      await callable({ guestId, ...input });
    } catch (error) {
      throw toGuestError(error);
    }
  }

  async deleteGuest(guestId: string): Promise<void> {
    try {
      const callable = httpsCallable<DeleteGuestFunctionInput, { guestId: string }>(functions, 'onDeleteGuest');
      await callable({ guestId });
    } catch (error) {
      throw toGuestError(error);
    }
  }
}
