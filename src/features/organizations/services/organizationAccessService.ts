import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { OrganizationRepository } from '@/repositories/interfaces/organizationRepository';
import { OrganizationAccessResult } from '@/features/organizations/types/organizationAccess';
import { OrganizationRole } from '@/types/membership';
import { OrganizationError } from '@/lib/appError';

/** An organization the current user belongs to — for the `/organizations` index page. */
export interface MyOrganizationSummary {
  organizationId: string;
  name: string;
  role: OrganizationRole;
}

const isPresent = <T>(value: T | null): value is T => value !== null;

/**
 * Loads a single organization for `/organizations/:organizationId`.
 *
 * Authorization is checked before the organization is read, so a user
 * cannot reach an organization by typing its URL. Firestore Security
 * Rules independently enforce the same boundary; this check exists to
 * produce correct application behaviour, not to be the boundary itself.
 * Mirrors `EventAccessService` exactly.
 */
export class OrganizationAccessService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly organizationRepository: OrganizationRepository
  ) {}

  async loadOrganization(userId: string, organizationId: string): Promise<OrganizationAccessResult> {
    if (!userId || !organizationId) {
      return { status: 'denied' };
    }

    const access = await this.authorizationService.canAccessOrganization(userId, organizationId);

    if (!access.allowed) {
      // A read failure is not a permission decision — surface it as an error so
      // the user is not told they lack access when the data is simply missing.
      if (access.reason === 'infrastructure_error') {
        throw new OrganizationError('internal_error', "We couldn't load this organization right now.");
      }
      return { status: 'denied' };
    }

    try {
      const [organization, membership] = await Promise.all([
        this.organizationRepository.getById(organizationId),
        this.authorizationService.getOrganizationMembership(userId, organizationId)
      ]);

      if (!organization) {
        return { status: 'notFound' };
      }

      if (!membership) {
        return { status: 'denied' };
      }

      return {
        status: 'allowed',
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          contactEmail: organization.contactEmail,
          contactPhone: organization.contactPhone,
          role: membership.role,
          canManage: this.authorizationService.canManageOrganization(membership)
        }
      };
    } catch (error) {
      if (error instanceof OrganizationError) {
        throw error;
      }
      throw new OrganizationError('internal_error', "We couldn't load this organization right now.");
    }
  }

  /**
   * The organizations the current user belongs to, for the
   * `/organizations` index page — reuses the exact same
   * `getUserOrganizations` + `organizationRepository.getById` reads
   * `EventCreationService.getCreatableOrganizations` already performs
   * for the "which org is this event for" picker, rather than a new
   * listing mechanism.
   */
  async listMyOrganizations(userId: string): Promise<MyOrganizationSummary[]> {
    if (!userId) {
      return [];
    }

    try {
      const memberships = await this.authorizationService.getUserOrganizations(userId);
      const resolved = await Promise.all(
        memberships.map(async (membership) => {
          const organization = await this.organizationRepository.getById(membership.organizationId);
          return organization ? { organizationId: organization.id, name: organization.name, role: membership.role } : null;
        })
      );
      return resolved.filter(isPresent);
    } catch {
      throw new OrganizationError('internal_error', "We couldn't load your organizations right now.");
    }
  }
}
