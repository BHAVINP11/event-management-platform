import { InvitationService } from '@/features/events/services/invitationService';
import { InvitationError } from '@/lib/appError';
import { EventMemberSide, EventRole } from '@/types/membership';

const mockCallable = jest.fn();

jest.mock('@/services/firebase/functions', () => ({ functions: {} }));
jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (input: unknown) => mockCallable(name, input)
}));

describe('InvitationService.createInvitation', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the createInvitation callable with the eventId included', async () => {
    mockCallable.mockResolvedValue({ data: { invitationId: 'inv1' } });
    const service = new InvitationService();

    const invitationId = await service.createInvitation('event1', {
      invitedEmail: 'meena@example.com',
      role: EventRole.Family
    });

    expect(invitationId).toBe('inv1');
    expect(mockCallable).toHaveBeenCalledWith('onCreateInvitation', {
      eventId: 'event1',
      invitedEmail: 'meena@example.com',
      role: EventRole.Family
    });
  });

  test('converts a role-not-allowed failure into a friendly InvitationError', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'not allowed',
      details: { appCode: 'event_role_not_allowed' }
    });
    const service = new InvitationService();

    await expect(
      service.createInvitation('event1', { invitedEmail: 'x@example.com', role: EventRole.Staff })
    ).rejects.toMatchObject({
      code: 'event_role_not_allowed',
      friendlyMessage: "Your role doesn't allow inviting people to this event."
    });
  });

  test('falls back to a generic message for an unrecognized app code', async () => {
    mockCallable.mockRejectedValue({ code: 'internal', message: 'boom' });
    const service = new InvitationService();

    const error = await service
      .createInvitation('event1', { invitedEmail: 'x@example.com', role: EventRole.Viewer })
      .catch((e) => e);

    expect(error).toBeInstanceOf(InvitationError);
    expect(error.friendlyMessage).toBe('Something went wrong. Please try again.');
  });
});

describe('InvitationService.acceptInvitation', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the acceptInvitation callable and returns its result', async () => {
    mockCallable.mockResolvedValue({ data: { eventId: 'event1', membershipId: 'event1_user1' } });
    const service = new InvitationService();

    const result = await service.acceptInvitation('inv1');

    expect(result).toEqual({ eventId: 'event1', membershipId: 'event1_user1' });
    expect(mockCallable).toHaveBeenCalledWith('onAcceptInvitation', { invitationId: 'inv1' });
  });

  test('surfaces an expired invitation as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'failed-precondition',
      message: 'expired',
      details: { appCode: 'invitation_expired' }
    });
    const service = new InvitationService();

    await expect(service.acceptInvitation('inv1')).rejects.toMatchObject({
      friendlyMessage: 'This invitation has expired.'
    });
  });

  test('surfaces an email mismatch as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'permission-denied',
      message: 'mismatch',
      details: { appCode: 'invitation_email_mismatch' }
    });
    const service = new InvitationService();

    await expect(service.acceptInvitation('inv1')).rejects.toMatchObject({
      friendlyMessage: 'This invitation was sent to a different email address.'
    });
  });
});

describe('InvitationService.getInvitationPreview', () => {
  beforeEach(() => mockCallable.mockReset());

  test('calls the getInvitationPreview callable and returns its result', async () => {
    mockCallable.mockResolvedValue({
      data: { eventName: 'Bhavin & Priya Wedding', invitedEmail: 'priya@example.com', role: EventRole.Couple, side: EventMemberSide.Bride }
    });
    const service = new InvitationService();

    const preview = await service.getInvitationPreview('inv1');

    expect(preview).toEqual({
      eventName: 'Bhavin & Priya Wedding',
      invitedEmail: 'priya@example.com',
      role: EventRole.Couple,
      side: EventMemberSide.Bride
    });
    expect(mockCallable).toHaveBeenCalledWith('onGetInvitationPreview', { invitationId: 'inv1' });
  });

  test('surfaces a not-found invitation as a friendly error', async () => {
    mockCallable.mockRejectedValue({
      code: 'not-found',
      message: 'missing',
      details: { appCode: 'invitation_not_found' }
    });
    const service = new InvitationService();

    await expect(service.getInvitationPreview('inv1')).rejects.toMatchObject({
      friendlyMessage: "We couldn't find this invitation."
    });
  });
});
