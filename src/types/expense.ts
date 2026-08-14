/**
 * An Expense is a single budget line item for an Event (e.g. "Venue
 * Booking", ₹2,00,000). It belongs to exactly one Event.
 */
export enum ExpenseCategory {
  Venue = 'venue',
  Catering = 'catering',
  Decoration = 'decoration',
  Photography = 'photography',
  Entertainment = 'entertainment',
  Transportation = 'transportation',
  Accommodation = 'accommodation',
  Jewellery = 'jewellery',
  Clothing = 'clothing',
  Invitation = 'invitation',
  Other = 'other'
}

export enum PaymentStatus {
  Unpaid = 'unpaid',
  PartiallyPaid = 'partially_paid',
  Paid = 'paid'
}

export interface Expense {
  id: string;
  eventId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentStatus: PaymentStatus;
  /**
   * Server-derived, never trusted directly from the client: 0 when unpaid,
   * equal to `amount` when paid, and the validated client-supplied figure
   * (0 <= paidAmount <= amount) only when partially_paid.
   */
  paidAmount: number;
  paymentDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
