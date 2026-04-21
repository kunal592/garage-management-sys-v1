/**
 * Formats a given amount of integer currency (paise/cents) into standard string layout (e.g., INR ₹).
 */
export function formatCurrency(amountInteger: number): string {
  // Amount is stored in cents/paise
  const decimalAmount = amountInteger / 100;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(decimalAmount);
}

/**
 * Formats ISO strings into human readable local format.
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
} 
