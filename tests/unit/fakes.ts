import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { OrganizationMemberRepository } from '@/repositories/interfaces/organizationMemberRepository';
import { OrganizationInvitationRepository } from '@/repositories/interfaces/organizationInvitationRepository';
import { EventRepository } from '@/repositories/interfaces/eventRepository';
import { EventMemberRepository } from '@/repositories/interfaces/eventMemberRepository';
import { InvitationRepository } from '@/repositories/interfaces/invitationRepository';
import { UserRepository } from '@/repositories/interfaces/userRepository';
import { GuestRepository } from '@/repositories/interfaces/guestRepository';
import { FunctionRepository } from '@/repositories/interfaces/functionRepository';
import { ExpenseRepository } from '@/repositories/interfaces/expenseRepository';
import { VendorRepository } from '@/repositories/interfaces/vendorRepository';
import { TaskRepository } from '@/repositories/interfaces/taskRepository';
import { RepositoryInfrastructureError } from '@/repositories/errors';
import { getEventMembershipId, getOrganizationMembershipId } from '@/repositories/membershipIds';
import { Organization } from '@/types/organization';
import { Event, EventStatus, EventType } from '@/types/event';
import { Invitation, InvitationStatus } from '@/types/invitation';
import { OrganizationInvitation } from '@/types/organizationInvitation';
import { User } from '@/types/user';
import { Guest, GuestSide, GuestStatus } from '@/types/guest';
import { EventFunction, EventFunctionStatus } from '@/types/eventFunction';
import { Expense, ExpenseCategory, PaymentStatus } from '@/types/expense';
import { Vendor, VendorCategory, VendorStatus } from '@/types/vendor';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import {
  EventMember,
  EventRole,
  MembershipStatus,
  OrganizationMember,
  OrganizationRole
} from '@/types/membership';

/**
 * In-memory repositories implementing the same interfaces the Firebase
 * repositories implement. These let the dashboard and event-access services be
 * tested without Firestore.
 */

const now = '2026-01-01T00:00:00.000Z';

export const buildOrganization = (overrides: Partial<Organization> & { id: string }): Organization => ({
  name: 'Royal Events',
  slug: 'royal-events',
  contactEmail: 'hello@royalevents.com',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildEvent = (overrides: Partial<Event> & { id: string }): Event => ({
  name: 'Bhavin & Priya Wedding',
  type: EventType.Wedding,
  status: EventStatus.Draft,
  organizationId: null,
  createdBy: 'user1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildOrganizationMember = (
  organizationId: string,
  userId: string,
  overrides: Partial<OrganizationMember> = {}
): OrganizationMember => ({
  id: getOrganizationMembershipId(organizationId, userId),
  organizationId,
  userId,
  role: OrganizationRole.Owner,
  status: MembershipStatus.Active,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildEventMember = (
  eventId: string,
  userId: string,
  overrides: Partial<EventMember> = {}
): EventMember => ({
  id: getEventMembershipId(eventId, userId),
  eventId,
  userId,
  role: EventRole.Owner,
  status: MembershipStatus.Active,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildInvitation = (
  overrides: Partial<Invitation> & { id: string; eventId: string; invitedEmail: string }
): Invitation => ({
  role: EventRole.Family,
  status: InvitationStatus.Pending,
  invitedBy: 'owner1',
  expiresAt: '2030-01-01T00:00:00.000Z',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildOrganizationInvitation = (
  overrides: Partial<OrganizationInvitation> & { id: string; organizationId: string; invitedEmail: string }
): OrganizationInvitation => ({
  role: OrganizationRole.Planner,
  status: InvitationStatus.Pending,
  invitedBy: 'owner1',
  expiresAt: '2030-01-01T00:00:00.000Z',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildUser = (overrides: Partial<User> & { id: string }): User => ({
  firstName: 'Bhavin',
  lastName: 'Patel',
  displayName: 'Bhavin Patel',
  email: 'bhavin@example.com',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildGuest = (overrides: Partial<Guest> & { id: string; eventId: string }): Guest => ({
  name: 'Rajesh Patel',
  side: GuestSide.Bride,
  status: GuestStatus.Pending,
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildEventFunction = (
  overrides: Partial<EventFunction> & { id: string; eventId: string }
): EventFunction => ({
  name: 'Mehndi',
  status: EventFunctionStatus.Planned,
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildExpense = (overrides: Partial<Expense> & { id: string; eventId: string }): Expense => ({
  title: 'Venue Booking',
  category: ExpenseCategory.Venue,
  amount: 200000,
  paymentStatus: PaymentStatus.Unpaid,
  paidAmount: 0,
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildVendor = (overrides: Partial<Vendor> & { id: string; eventId: string }): Vendor => ({
  name: 'Royal Caterers',
  category: VendorCategory.Catering,
  status: VendorStatus.Enquiry,
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

export const buildTask = (overrides: Partial<Task> & { id: string; eventId: string }): Task => ({
  title: 'Book the venue',
  status: TaskStatus.Todo,
  priority: TaskPriority.Medium,
  createdBy: 'owner1',
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const unsupported = (): never => {
  throw new Error('Not needed for these tests.');
};

export class FakeOrganizationRepository implements OrganizationRepository {
  failing = false;
  readonly reads: string[] = [];

  constructor(private readonly organizations: readonly Organization[] = []) {}

  async getById(organizationId: string): Promise<Organization | null> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to load organization.');
    }
    this.reads.push(organizationId);
    return this.organizations.find((o) => o.id === organizationId) ?? null;
  }

  create = unsupported;
  update = unsupported;
}

export class FakeEventRepository implements EventRepository {
  failing = false;
  readonly reads: string[] = [];

  constructor(private readonly events: readonly Event[] = []) {}

  async getById(eventId: string): Promise<Event | null> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to load event.');
    }
    this.reads.push(eventId);
    return this.events.find((e) => e.id === eventId) ?? null;
  }

  create = unsupported;
  update = unsupported;
}

export class FakeOrganizationMemberRepository implements OrganizationMemberRepository {
  failing = false;

  constructor(private readonly members: readonly OrganizationMember[] = []) {}

  async getById(memberId: string): Promise<OrganizationMember | null> {
    return this.members.find((m) => m.id === memberId) ?? null;
  }

  async listByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    return this.members.filter((m) => m.organizationId === organizationId);
  }

  async listByUser(userId: string): Promise<OrganizationMember[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list organization members.');
    }
    return this.members.filter((m) => m.userId === userId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeEventMemberRepository implements EventMemberRepository {
  failing = false;

  constructor(private readonly members: readonly EventMember[] = []) {}

  async getById(memberId: string): Promise<EventMember | null> {
    return this.members.find((m) => m.id === memberId) ?? null;
  }

  async listByEvent(eventId: string): Promise<EventMember[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list event members.');
    }
    return this.members.filter((m) => m.eventId === eventId);
  }

  async listByUser(userId: string): Promise<EventMember[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list event members.');
    }
    return this.members.filter((m) => m.userId === userId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeInvitationRepository implements InvitationRepository {
  failing = false;

  constructor(private readonly invitations: readonly Invitation[] = []) {}

  async getById(invitationId: string): Promise<Invitation | null> {
    return this.invitations.find((i) => i.id === invitationId) ?? null;
  }

  async listByEvent(eventId: string): Promise<Invitation[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list invitations.');
    }
    return this.invitations.filter((i) => i.eventId === eventId);
  }

  async listPendingByEmail(email: string): Promise<Invitation[]> {
    return this.invitations.filter((i) => i.invitedEmail === email && i.status === InvitationStatus.Pending);
  }

  create = unsupported;
  update = unsupported;
}

export class FakeOrganizationInvitationRepository implements OrganizationInvitationRepository {
  failing = false;

  constructor(private readonly invitations: readonly OrganizationInvitation[] = []) {}

  async getById(invitationId: string): Promise<OrganizationInvitation | null> {
    return this.invitations.find((i) => i.id === invitationId) ?? null;
  }

  async listByOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list organization invitations.');
    }
    return this.invitations.filter((i) => i.organizationId === organizationId);
  }

  create = unsupported;
  update = unsupported;
}

export class FakeUserRepository implements UserRepository {
  failing = false;

  constructor(private readonly users: readonly User[] = []) {}

  async getById(userId: string): Promise<User | null> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to load user profile.');
    }
    return this.users.find((u) => u.id === userId) ?? null;
  }

  create = unsupported;
  update = unsupported;
}

export class FakeGuestRepository implements GuestRepository {
  failing = false;

  constructor(private readonly guests: readonly Guest[] = []) {}

  async getById(guestId: string): Promise<Guest | null> {
    return this.guests.find((g) => g.id === guestId) ?? null;
  }

  async listByEvent(eventId: string): Promise<Guest[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list guests.');
    }
    return this.guests.filter((g) => g.eventId === eventId);
  }

  async listByEventAndSide(eventId: string, side: GuestSide): Promise<Guest[]> {
    return this.guests.filter((g) => g.eventId === eventId && g.side === side);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeFunctionRepository implements FunctionRepository {
  failing = false;

  constructor(private readonly functionsList: readonly EventFunction[] = []) {}

  async getById(functionId: string): Promise<EventFunction | null> {
    return this.functionsList.find((f) => f.id === functionId) ?? null;
  }

  async listByEvent(eventId: string): Promise<EventFunction[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list functions.');
    }
    return this.functionsList.filter((f) => f.eventId === eventId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeExpenseRepository implements ExpenseRepository {
  failing = false;

  constructor(private readonly expenses: readonly Expense[] = []) {}

  async getById(expenseId: string): Promise<Expense | null> {
    return this.expenses.find((e) => e.id === expenseId) ?? null;
  }

  async listByEvent(eventId: string): Promise<Expense[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list expenses.');
    }
    return this.expenses.filter((e) => e.eventId === eventId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeVendorRepository implements VendorRepository {
  failing = false;

  constructor(private readonly vendors: readonly Vendor[] = []) {}

  async getById(vendorId: string): Promise<Vendor | null> {
    return this.vendors.find((v) => v.id === vendorId) ?? null;
  }

  async listByEvent(eventId: string): Promise<Vendor[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list vendors.');
    }
    return this.vendors.filter((v) => v.eventId === eventId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}

export class FakeTaskRepository implements TaskRepository {
  failing = false;

  constructor(private readonly tasks: readonly Task[] = []) {}

  async getById(taskId: string): Promise<Task | null> {
    return this.tasks.find((t) => t.id === taskId) ?? null;
  }

  async listByEvent(eventId: string): Promise<Task[]> {
    if (this.failing) {
      throw new RepositoryInfrastructureError('Failed to list tasks.');
    }
    return this.tasks.filter((t) => t.eventId === eventId);
  }

  create = unsupported;
  update = unsupported;
  delete = unsupported;
}
