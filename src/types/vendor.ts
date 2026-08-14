/**
 * A Vendor is a service provider being considered or booked for an Event
 * (e.g. a caterer, photographer). It is event-specific — not a shared
 * marketplace entity or a vendor account.
 */
export enum VendorCategory {
  Venue = 'venue',
  Catering = 'catering',
  Decoration = 'decoration',
  Photography = 'photography',
  Videography = 'videography',
  Entertainment = 'entertainment',
  Transportation = 'transportation',
  Accommodation = 'accommodation',
  Jewellery = 'jewellery',
  Makeup = 'makeup',
  Invitation = 'invitation',
  Other = 'other'
}

export enum VendorStatus {
  Enquiry = 'enquiry',
  Shortlisted = 'shortlisted',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled'
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  category: VendorCategory;
  phone?: string;
  email?: string;
  notes?: string;
  status: VendorStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
