import { Vendor } from '@/types/vendor';

/**
 * Alphabetical ordering for an event's vendors, done entirely client-side
 * over the already-loaded list — no new query. Vendors have no event-
 * relevant date field to sort by (unlike Functions' `date` or Expenses'
 * `createdAt`-as-recency); `name` is the field a user scanning a vendor
 * list actually benefits from ordering by.
 */
export function sortVendorsByName(vendors: readonly Vendor[]): Vendor[] {
  return [...vendors].sort((a, b) => a.name.localeCompare(b.name));
}
