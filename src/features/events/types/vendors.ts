import { Vendor, VendorCategory, VendorStatus } from '@/types/vendor';

export interface VendorListData {
  /** Every vendor for the event — no side-scoping for this domain. */
  vendors: Vendor[];
  /** Whether the current user may add/edit/remove vendors (owner/planner only). */
  canManage: boolean;
}

export type VendorListAccessResult =
  | { status: 'allowed'; data: VendorListData }
  | { status: 'denied' }
  | { status: 'notFound' };

/** The editable vendor fields, shared by the add and edit forms. */
export interface VendorFormInput {
  name: string;
  category: VendorCategory;
  phone?: string;
  email?: string;
  notes?: string;
  status: VendorStatus;
}
