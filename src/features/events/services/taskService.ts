import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/services/firebase/functions';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { TaskRepository } from '@/repositories/interfaces/taskRepository';
import { EventPeopleService } from '@/features/events/services/eventPeopleService';
import { canManageAllTasks } from '@/features/events/services/taskAuthorization';
import { AssignableMember, TaskFormInput, TaskListAccessResult } from '@/features/events/types/tasks';
import { personRoleDisplayLabel } from '@/features/events/types/people';
import { eventMemberSideLabel, eventRoleLabel } from '@/lib/labels';
import { MembershipStatus } from '@/types/membership';
import { EventLoadError, TaskError } from '@/lib/appError';

interface CreateTaskCallableInput extends TaskFormInput {
  eventId: string;
}

interface CreateTaskCallableOutput {
  taskId: string;
}

interface UpdateTaskCallableInput extends TaskFormInput {
  taskId: string;
}

interface DeleteTaskCallableInput {
  taskId: string;
}

const friendlyMessages: Record<string, string> = {
  unauthenticated: 'You must be logged in to do this.',
  invalid_input: "Some of the task's details don't look right. Please check and try again.",
  invalid_title: 'Please enter a valid title.',
  invalid_description: 'Please shorten the description.',
  invalid_due_date: 'Please enter a valid due date.',
  invalid_status: 'Please choose a valid status.',
  invalid_priority: 'Please choose a valid priority.',
  invalid_assigned_to: 'Please assign this task to an active member of this event.',
  invalid_event_id: "We couldn't identify the event. Please try again.",
  invalid_task_id: "We couldn't identify the task. Please try again.",
  event_not_found: "We couldn't find this event.",
  event_access_denied: "You don't have access to this event.",
  event_role_not_allowed: "Your role doesn't allow doing that for this event.",
  task_not_found: "We couldn't find this task.",
  task_assignment_not_allowed: 'You may only update tasks assigned to you.',
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
const toTaskError = (error: unknown): TaskError => {
  const details = (error as { details?: { appCode?: unknown } } | undefined)?.details;
  const appCode = typeof details?.appCode === 'string' ? details.appCode : undefined;
  const code = appCode ?? (error as { code?: string } | undefined)?.code ?? 'internal_error';
  return new TaskError(code, friendlyMessages[code] ?? friendlyMessages.internal_error);
};

/**
 * Reads the task list through the repository/Firestore-rules boundary;
 * writes go exclusively through the trusted createTask/updateTask/
 * deleteTask Cloud Functions, which independently re-verify the caller's
 * authority — owner/planner may manage any task, staff only a task
 * assigned to themselves (see `functions/src/tasks/authorization.ts`) —
 * regardless of what this service or the UI show.
 *
 * The "Assigned To" choices reuse `EventPeopleService` rather than reading
 * `EventMemberRepository` directly, so task-assignment display names stay
 * in lockstep with the People page's own name-resolution rule (only the
 * current user's own name is ever resolvable — see docs/tasks.md).
 */
export class TaskService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly eventRepository: EventRepository,
    private readonly taskRepository: TaskRepository,
    private readonly eventPeopleService: EventPeopleService
  ) {}

  async listTasks(userId: string, eventId: string): Promise<TaskListAccessResult> {
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
      const [tasks, peopleResult] = await Promise.all([
        this.taskRepository.listByEvent(eventId),
        this.eventPeopleService.listPeople(userId, eventId)
      ]);

      const members = peopleResult.status === 'allowed' ? peopleResult.data.members : [];

      const memberLabelByUserId: Record<string, string> = {};
      const assignableMembers: AssignableMember[] = [];

      for (const member of members) {
        const label = member.label ?? personRoleDisplayLabel(member.role, member.side, eventRoleLabel, eventMemberSideLabel);
        memberLabelByUserId[member.userId] = label;
        if (member.status === MembershipStatus.Active) {
          assignableMembers.push({ userId: member.userId, label });
        }
      }

      return {
        status: 'allowed',
        data: {
          tasks,
          assignableMembers,
          memberLabelByUserId,
          canManageAll: canManageAllTasks(membership?.role),
          currentUserId: userId,
          currentUserRole: membership?.role
        }
      };
    } catch {
      throw new EventLoadError();
    }
  }

  async createTask(eventId: string, input: TaskFormInput): Promise<string> {
    try {
      const callable = httpsCallable<CreateTaskCallableInput, CreateTaskCallableOutput>(functions, 'onCreateTask');
      const result: HttpsCallableResult<CreateTaskCallableOutput> = await callable({ eventId, ...input });
      return result.data.taskId;
    } catch (error) {
      throw toTaskError(error);
    }
  }

  async updateTask(taskId: string, input: TaskFormInput): Promise<void> {
    try {
      const callable = httpsCallable<UpdateTaskCallableInput, { taskId: string }>(functions, 'onUpdateTask');
      await callable({ taskId, ...input });
    } catch (error) {
      throw toTaskError(error);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const callable = httpsCallable<DeleteTaskCallableInput, { taskId: string }>(functions, 'onDeleteTask');
      await callable({ taskId });
    } catch (error) {
      throw toTaskError(error);
    }
  }
}
