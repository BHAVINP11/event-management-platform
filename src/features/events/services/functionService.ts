import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { FunctionRepository } from '@/repositories/interfaces/functionRepository';
import { FunctionFormInput, FunctionListAccessResult } from '@/features/events/types/functions';
import { EventRole } from '@/types/membership';
import { EventLoadError, FunctionError } from '@/lib/appError';

interface CreateFunctionCallableInput extends FunctionFormInput {
  eventId: string;
}

interface CreateFunctionCallableOutput {
  functionId: string;
}

interface UpdateFunctionCallableInput extends FunctionFormInput {
  functionId: string;
}

interface DeleteFunctionCallableInput {
  functionId: string;
}

const MANAGEMENT_ROLES: readonly EventRole[] = [EventRole.Owner, EventRole.Planner];

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the function's details don't look right. Please check and try again.",
  invalid_name: 'Please enter a valid name.',
  invalid_description: 'Please shorten the description.',
  invalid_date: 'Please enter a valid date.',
  invalid_start_time: 'Please enter a valid start time.',
  invalid_end_time: 'Please enter a valid end time.',
  invalid_time_range: 'End time cannot be before start time.',
  invalid_venue: 'Please enter a valid venue.',
  invalid_notes: 'Please shorten the notes.',
  invalid_status: 'Please choose a valid status.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_function_id: "We couldn't identify the function. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow managing functions for this event.",
  function_not_found: "We couldn't find this function.",
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
const toFunctionError = (error: unknown): FunctionError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new FunctionError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Reads the function/ceremony list through the repository/Firestore-rules
 * boundary; writes go exclusively through the trusted createFunction/
 * updateFunction/deleteFunction Cloud Functions, which independently
 * re-verify the caller's role (owner/planner only) regardless of what this
 * service or the UI show.
 *
 * Unlike guests, there is no side-scoping here — every active event member
 * sees every function; only who may *manage* them differs.
 */
export class FunctionService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly functionRepository: FunctionRepository
  ) {}

  async listFunctions(userId: string, eventId: string): Promise<FunctionListAccessResult> {
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
      const functionsList = await this.functionRepository.listByEvent(eventId);

      return {
        status: 'allowed',
        data: {
          functions: functionsList,
          canManage: Boolean(membership && MANAGEMENT_ROLES.includes(membership.role))
        }
      };
    } catch {
      throw new EventLoadError();
    }
  }

  async createFunction(eventId: string, input: FunctionFormInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateFunctionCallableInput, CreateFunctionCallableOutput>(
        functions,
        'onCreateFunction'
      );
      const result: HttpsCallableResult<CreateFunctionCallableOutput> = await callable({ eventId, ...input });
      return result.data.functionId;
    } catch (error) {
      throw toFunctionError(error);
    }
  }

  async updateFunction(functionId: string, input: FunctionFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateFunctionCallableInput, { functionId: string }>(
        functions,
        'onUpdateFunction'
      );
      await callable({ functionId, ...input });
    } catch (error) {
      throw toFunctionError(error);
    }
  }

  async deleteFunction(functionId: string): Promise<void> {
    try {
      const callable = httpsCallable<DeleteFunctionCallableInput, { functionId: string }>(
        functions,
        'onDeleteFunction'
      );
      await callable({ functionId });
    } catch (error) {
      throw toFunctionError(error);
    }
  }
}
