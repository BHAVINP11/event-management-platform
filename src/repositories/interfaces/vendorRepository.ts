import { Vendor } from '@/types/vendor';

export interface VendorRepository {
  getById(vendorId: string): Promise<Vendor | null>;
  create(vendor: Omit<Vendor, 'id'>): Promise<Vendor>;
  update(vendor: Vendor): Promise<Vendor>;
  delete(vendorId: string): Promise<void>;
  listByEvent(eventId: string): Promise<Vendor[]>;
}
