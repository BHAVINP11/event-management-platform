import { FirebaseOrganizationRepository } from '@/services/firebase/repositories/firebaseOrganizationRepository';
import { FirebaseOrganizationMemberRepository } from '@/services/firebase/repositories/firebaseOrganizationMemberRepository';
import { FirebaseEventRepository } from '@/services/firebase/repositories/firebaseEventRepository';
import { FirebaseEventMemberRepository } from '@/services/firebase/repositories/firebaseEventMemberRepository';
import { FirebaseInvitationRepository } from '@/services/firebase/repositories/firebaseInvitationRepository';
import { FirebaseUserRepository } from '@/services/firebase/repositories/firebaseUserRepository';
import { FirebaseGuestRepository } from '@/services/firebase/repositories/firebaseGuestRepository';
import { FirebaseFunctionRepository } from '@/services/firebase/repositories/firebaseFunctionRepository';
import { FirebaseExpenseRepository } from '@/services/firebase/repositories/firebaseExpenseRepository';
import { FirebaseVendorRepository } from '@/services/firebase/repositories/firebaseVendorRepository';
import { FirebaseTaskRepository } from '@/services/firebase/repositories/firebaseTaskRepository';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { DashboardService } from '@/features/dashboard/services/dashboardService';
import { EventAccessService } from '@/features/events/services/eventAccessService';
import { EventCreationService } from '@/features/events/services/eventCreationService';
import { EventPeopleService } from '@/features/events/services/eventPeopleService';
import { InvitationService } from '@/features/events/services/invitationService';
import { GuestService } from '@/features/events/services/guestService';
import { FunctionService } from '@/features/events/services/functionService';
import { ExpenseService } from '@/features/events/services/expenseService';
import { VendorService } from '@/features/events/services/vendorService';
import { TaskService } from '@/features/events/services/taskService';

/**
 * Composition root.
 *
 * The only place where Firebase repository implementations are bound to the
 * services that consume them. Feature services depend on repository interfaces
 * and are constructed here, which keeps Firestore out of feature and UI code.
 */

const organizationRepository = new FirebaseOrganizationRepository();
const organizationMemberRepository = new FirebaseOrganizationMemberRepository();
const eventRepository = new FirebaseEventRepository();
const eventMemberRepository = new FirebaseEventMemberRepository();
const invitationRepository = new FirebaseInvitationRepository();
const userRepository = new FirebaseUserRepository();
const guestRepository = new FirebaseGuestRepository();
const functionRepository = new FirebaseFunctionRepository();
const expenseRepository = new FirebaseExpenseRepository();
const vendorRepository = new FirebaseVendorRepository();
const taskRepository = new FirebaseTaskRepository();

export const authorizationService = new AuthorizationService(
  organizationMemberRepository,
  eventMemberRepository
);

export const dashboardService = new DashboardService(
  authorizationService,
  organizationRepository,
  eventRepository
);

export const eventAccessService = new EventAccessService(
  authorizationService,
  eventRepository,
  organizationRepository
);

export const eventCreationService = new EventCreationService(authorizationService, organizationRepository);

export const eventPeopleService = new EventPeopleService(
  authorizationService,
  eventRepository,
  eventMemberRepository,
  invitationRepository,
  userRepository
);

export const invitationService = new InvitationService();

export const guestService = new GuestService(authorizationService, eventRepository, guestRepository);

export const functionService = new FunctionService(authorizationService, eventRepository, functionRepository);

export const expenseService = new ExpenseService(authorizationService, eventRepository, expenseRepository);

export const vendorService = new VendorService(authorizationService, eventRepository, vendorRepository);

export const taskService = new TaskService(authorizationService, eventRepository, taskRepository, eventPeopleService);
