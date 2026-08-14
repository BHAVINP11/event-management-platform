/** Formats a plain number as Indian Rupees, e.g. 1000000 -> "₹10,00,000". No currency conversion. */
export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
