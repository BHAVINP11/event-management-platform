import { FirebaseOrganizationRepository } from '@/services/firebase/repositories/firebaseOrganizationRepository';
import { FirebaseOrganizationMemberRepository } from '@/services/firebase/repositories/firebaseOrganizationMemberRepository';
import { FirebaseEventRepository } from '@/services/firebase/repositories/firebaseEventRepository';
import { FirebaseEventMemberRepository } from '@/services/firebase/repositories/firebaseEventMemberRepository';
import { FirebaseInvitationRepository } from '@/services/firebase/repositories/firebaseInvitationRepository';
import { FirebaseUserRepository } from '@/services/firebase/repositories/firebaseUserRepository';
import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { DashboardService } from '@/features/dashboard/services/dashboardService';
import { EventAccessService } from '@/features/events/services/eventAccessService';
import { EventCreationService } from '@/features/events/services/eventCreationService';
import { EventPeopleService } from '@/features/events/services/eventPeopleService';
import { InvitationService } from '@/features/events/services/invitationService';

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
