import { AuthorizationService } from '@/features/auth/services/authorizationService';
import { VendorService } from '@/features/events/services/vendorService';
import { VendorError, EventLoadError } from '@/lib/appError';
import { EventRole, MembershipStatus } from '@/types/membership';
import { VendorCategory, VendorStatus } from '@/types/vendor';
import {
  buildEvent,
  buildEventMember,
  buildVendor,
  FakeEventMemberRepository,
  FakeEventRepository,
  FakeVendorRepository,
  FakeOrganizationMemberRepository
} from './fakes';

const mockCallable = jest.fn();

jest.mock('@/services/firebase/functions', () => ({ functions: {} }));
jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (input: unknown) => mockCallable(name, input)
}));

interface WorldOptions {
  events?: ReturnType<typeof buildEvent>[];
  eventMembers?: ReturnType<typeof buildEventMember>[];
  vendors?: ReturnType<typeof buildVendor>[];
}

const buildWorld = (options: WorldOptions = {}) => {
  const eventRepository = new FakeEventRepository(options.events ?? []);
  const eventMemberRepository = new FakeEventMemberRepository(options.eventMembers ?? []);
  const vendorRepository = new FakeVendorRepository(options.vendors ?? []);

  const authorizationService = new AuthorizationService(
    new FakeOrganizationMemberRepository([]),
    eventMemberRepository
  );

  return {
    vendorRepository,
    service: new VendorService(authorizationService, eventRepository, vendorRepository)
  };
};

describe('VendorService.listVendors', () => {
  beforeEach(() => mockCallable.mockReset());

  test('denies a user with no active membership', async () => {
    const { service } = buildWorld({ events: [buildEvent({ id: 'event1' })] });

    await expect(service.listVendors('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('reports not found when the event document is missing', async () => {
    const { service } = buildWorld({ eventMembers: [buildEventMember('event1', 'user1')] });

    await expect(service.listVendors('user1', 'event1')).resolves.toEqual({ status: 'notFound' });
  });

  test('an inactive membership is denied', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { status: MembershipStatus.Inactive })]
    });

    await expect(service.listVendors('user1', 'event1')).resolves.toEqual({ status: 'denied' });
  });

  test('lists every vendor for the event, regardless of role', async () => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role: EventRole.Viewer })],
      vendors: [
        buildVendor({ id: 'v1', eventId: 'event1', name: 'Royal Caterers' }),
        buildVendor({ id: 'v2', eventId: 'event1', name: 'Dream Decor' }),
        buildVendor({ id: 'v3', eventId: 'event2', name: "Someone Else's Vendor" })
      ]
    });

    const result = await service.listVendors('user1', 'event1');

    expect(result.status).toBe('allowed');
    if (result.status !== 'allowed') return;
    expect(result.data.vendors.map((v) => v.name).sort()).toEqual(['Dream Decor', 'Royal Caterers']);
  });

  test.each([EventRole.Owner, EventRole.Planner])('offers canManage to %s', async (role) => {
    const { service } = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1', { role })]
    });

    const result = await service.listVendors('user1', 'event1');

    expect(result.status === 'allowed' && result.data.canManage).toBe(true);
  });

  test.each([EventRole.Couple, EventRole.Family, EventRole.Staff, EventRole.Viewer])(
    'does not offer canManage to %s',
    async (role) => {
      const { service } = buildWorld({
        events: [buildEvent({ id: 'event1' })],
        eventMembers: [buildEventMember('event1', 'user1', { role })]
      });

      const result = await service.listVendors('user1', 'event1');

      expect(result.status === 'allowed' && result.data.canManage).toBe(false);
    }
  );

  test('surfaces a repository failure as an application error', async () => {
    const world = buildWorld({
      events: [buildEvent({ id: 'event1' })],
      eventMembers: [buildEventMember('event1', 'user1')]
    });
    world.vendorRepository.failing = true;

    await expect(world.service.listVendors('user1', 'event1')).rejects.toBeInstanceOf(EventLoadError);
  });
});

describe('VendorService.createVendor', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the createVendor callable with the eventId included', async () => {
    mockCallable.mockResolvedValue({ data: { vendorId: 'vendor1' } });
    const { service } = buildWorld();

    const vendorId = await service.createVendor('event1', {
      name: 'Royal Caterers',
      category: VendorCategory.Catering,
      status: VendorStatus.Enquiry
    });

    expect(vendorId).toBe('vendor1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateVendor', {
      eventId: 'event1',
      name: 'Royal Caterers',
      category: VendorCategory.Catering,
      status: VendorStatus.Enquiry
    });
  });

  test('converts a role-not-allowed failure into a friendly VendorError', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const { service } = buildWorld();

    await expect(
      service.createVendor('event1', { name: 'Royal Caterers', category: VendorCategory.Catering, status: VendorStatus.Enquiry })
    ).rejects.toMatchObject({
      code: 'event_role_not_allowed',
      friendlyMessage: "Your role doesn't allow managing vendors for this event."
    });
  });

  test('falls back to a generic message for an unrecognized app code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const { service } = buildWorld();

    const error = await service
      .createVendor('event1', { name: 'Royal Caterers', category: VendorCategory.Catering, status: VendorStatus.Enquiry })
      .catch((e) => e);

    expect(error).toBeInstanceOf(VendorError);
    expect(error.friendlyMessage).toBe('Something went wrong. Please try again.');
  });
});

describe('VendorService.updateVendor', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the updateVendor callable with the vendorId included', async () => {
    mockCallable.mockResolvedValue({ data: { vendorId: 'vendor1' } });
    const { service } = buildWorld();

    await service.updateVendor('vendor1', {
      name: 'Royal Caterers Pvt Ltd',
      category: VendorCategory.Catering,
      status: VendorStatus.Shortlisted
    });

    expect(mockCallable).toHaveBeenCalledWith('onUpdateVendor', {
      vendorId: 'vendor1',
      name: 'Royal Caterers Pvt Ltd',
      category: VendorCategory.Catering,
      status: VendorStatus.Shortlisted
    });
  });

  test('surfaces a not-found vendor as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'not-found',
      message: 'missing',
      details: { appCode: 'vendor_not_found' }
    });
    const { service } = buildWorld();

    await expect(
      service.updateVendor('vendor1', { name: 'x', category: VendorCategory.Other, status: VendorStatus.Enquiry })
    ).rejects.toMatchObject({ friendlyMessage: "We couldn't find this vendor." });
  });
});

describe('VendorService.deleteVendor', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the deleteVendor callable', async () => {
    mockCallable.mockResolvedValue({ data: { vendorId: 'vendor1' } });
    const { service } = buildWorld();

    await service.deleteVendor('vendor1');

    expect(mockCallable).toHaveBeenCalledWith('onDeleteVendor', { vendorId: 'vendor1' });
  });

  test('surfaces an access-denied failure as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'denied',
      details: { appCode: 'event_access_denied' }
    });
    const { service } = buildWorld();

    await expect(service.deleteVendor('vendor1')).rejects.toMatchObject({
      friendlyMessage: "You don't have access to this event."
    });
  });
});
