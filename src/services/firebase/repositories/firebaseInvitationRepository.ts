import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Invitation, InvitationStatus } from '@/types/invitation';
import { EventMemberSide, EventRole } from '@/types/membership';
import { InvitationRepository } from '@/repositories/interfaces/invitationRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getOptionalString,
  getOptionalValidatedEnum,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const invitationsCollection = 'invitations';

const validEventRoles = Object.values(EventRole) as readonly Invitation['role'][];
const validEventMemberSides = Object.values(EventMemberSide) as readonly EventMemberSide[];
const validInvitationStatuses = Object.values(InvitationStatus) as readonly Invitation['status'][];

const mapInvitationToFirestore = (invitation: Invitation): Record<string, unknown> => ({
  id: invitation.id,
  eventId: invitation.eventId,
  invitedEmail: invitation.invitedEmail,
  invitedPhone: invitation.invitedPhone,
  role: invitation.role,
  side: invitation.side ?? null,
  status: invitation.status,
  invitedBy: invitation.invitedBy,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
  updatedAt: invitation.updatedAt
});

const mapFirestoreToInvitation = (invitationId: string, data: Record<string, unknown>): Invitation => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid invitation document.');
  }

  return {
    id: invitationId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    invitedEmail: getRequiredString(data.invitedEmail, 'invitedEmail'),
    invitedPhone: getOptionalString(data.invitedPhone),
    role: getValidatedEnum(data.role, 'role', validEventRoles),
    side: getOptionalValidatedEnum(data.side, 'side', validEventMemberSides),
    status: getValidatedEnum(data.status, 'status', validInvitationStatuses),
    invitedBy: getRequiredString(data.invitedBy, 'invitedBy'),
    expiresAt: getRequiredString(data.expiresAt, 'expiresAt'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed InvitationRepository.
 *
 * `create`/`update` exist for interface completeness (matching the other
 * repositories) but are never called by application code — Firestore rules
 * deny all client writes to `invitations`; the trusted Cloud Functions
 * (createInvitation, acceptInvitation) are the only writers.
 */
export class FirebaseInvitationRepository implements InvitationRepository {
  private collectionPath = collection(firestore, invitationsCollection);

  async getById(invitationId: string): Promise<Invitation | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, invitationId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToInvitation(invitationId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load invitation.');
    }
  }

  async create(invitation: Omit<Invitation, 'id'>): Promise<Invitation> {
    try {
      const ref = doc(this.collectionPath);
      const createdInvitation: Invitation = { ...invitation, id: ref.id };
      await setDoc(ref, mapInvitationToFirestore(createdInvitation));
      return createdInvitation;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create invitation.');
    }
  }

  async update(invitation: Invitation): Promise<Invitation> {
    try {
      const ref = doc(this.collectionPath, invitation.id);
      await updateDoc(ref, mapInvitationToFirestore(invitation));
      return invitation;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update invitation.');
    }
  }

  async listByEvent(eventId: string): Promise<Invitation[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToInvitation(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list invitations.');
    }
  }

  async listPendingByEmail(email: string): Promise<Invitation[]> {
    try {
      const q = query(
        this.collectionPath,
        where('invitedEmail', '==', email),
        where('status', '==', InvitationStatus.Pending)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToInvitation(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list invitations.');
    }
  }
}
