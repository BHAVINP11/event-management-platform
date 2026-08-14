import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Vendor, VendorCategory, VendorStatus } from '@/types/vendor';
import { VendorRepository } from '@/repositories/interfaces/vendorRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getOptionalString,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const vendorsCollection = 'vendors';

const validCategories = Object.values(VendorCategory) as readonly Vendor['category'][];
const validStatuses = Object.values(VendorStatus) as readonly Vendor['status'][];

const mapVendorToFirestore = (vendor: Vendor): Record<string, unknown> => ({
  id: vendor.id,
  eventId: vendor.eventId,
  name: vendor.name,
  category: vendor.category,
  phone: vendor.phone,
  email: vendor.email,
  notes: vendor.notes,
  status: vendor.status,
  createdBy: vendor.createdBy,
  createdAt: vendor.createdAt,
  updatedAt: vendor.updatedAt
});

const mapFirestoreToVendor = (vendorId: string, data: Record<string, unknown>): Vendor => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid vendor document.');
  }

  return {
    id: vendorId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    name: getRequiredString(data.name, 'name'),
    category: getValidatedEnum(data.category, 'category', validCategories),
    phone: getOptionalString(data.phone),
    email: getOptionalString(data.email),
    notes: getOptionalString(data.notes),
    status: getValidatedEnum(data.status, 'status', validStatuses),
    createdBy: getRequiredString(data.createdBy, 'createdBy'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed VendorRepository. `vendors/{vendorId}` — a flat
 * top-level collection carrying an `eventId` field, matching guests/
 * functions/expenses rather than an `events/{eventId}/vendors`
 * subcollection.
 *
 * `create`/`update`/`delete` exist for interface completeness (matching
 * the other repositories) but are never called by application code —
 * Firestore rules deny all client writes to `vendors`; the trusted Cloud
 * Functions (createVendor, updateVendor, deleteVendor) are the only
 * writers.
 */
export class FirebaseVendorRepository implements VendorRepository {
  private collectionPath = collection(firestore, vendorsCollection);

  async getById(vendorId: string): Promise<Vendor | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, vendorId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToVendor(vendorId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load vendor.');
    }
  }

  async create(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
    try {
      const ref = doc(this.collectionPath);
      const created: Vendor = { ...vendor, id: ref.id };
      await setDoc(ref, mapVendorToFirestore(created));
      return created;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create vendor.');
    }
  }

  async update(vendor: Vendor): Promise<Vendor> {
    try {
      const ref = doc(this.collectionPath, vendor.id);
      await updateDoc(ref, mapVendorToFirestore(vendor));
      return vendor;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update vendor.');
    }
  }

  async delete(vendorId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, vendorId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete vendor.');
    }
  }

  async listByEvent(eventId: string): Promise<Vendor[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToVendor(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list vendors.');
    }
  }
}
