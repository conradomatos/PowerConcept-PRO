/**
 * Currency formatting and parsing utilities for Brazilian Real (BRL)
 */

/**
 * Format a number as Brazilian Real currency string (R$ 1.234,56)
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) return '';

  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number as currency without the R$ symbol (1.234,56)
 */
export function formatCurrencyValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) return '';

  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a Brazilian Real currency string to a number
 * Handles formats like: "R$ 1.234,56", "1.234,56", "1234.56", "1234,56"
 */
export function parseCurrency(value: string | null | undefined): number {
  if (!value || typeof value !== 'string') return 0;

  // Remove currency symbol and whitespace
  let cleaned = value.replace(/R\$\s*/g, '').trim();

  // Check if it's using Brazilian format (dots for thousands, comma for decimals)
  // If there's a comma followed by exactly 2 digits at the end, it's Brazilian format
  const brazilianFormat = /,\d{2}$/.test(cleaned);

  if (brazilianFormat) {
    // Brazilian format: 1.234,56 -> 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Simple comma as decimal: 1234,56 -> 1234.56
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Apply currency mask to input value
 * Formats as user types: 1234 -> 12,34 -> 123,45 -> 1.234,56
 */
export function applyCurrencyMask(inputValue: string): string {
  // Remove everything except digits
  const digits = inputValue.replace(/\D/g, '');

  if (!digits) return '';

  // Convert to number (divide by 100 to get decimal places)
  const numericValue = parseInt(digits, 10) / 100;

  // Format as Brazilian currency without symbol
  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Get numeric value from masked currency input
 */
export function getCurrencyNumericValue(maskedValue: string): number {
  if (!maskedValue) return 0;

  // Remove dots (thousand separators) and replace comma with dot
  const cleaned = maskedValue.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format date string (ISO format) to Brazilian format (dd/mm/aaaa)
 * Returns "Em aberto" if null
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Em aberto';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}

/**
 * Alias de compatibilidade — usar parseCurrency de preferência
 */
export const parseCurrencyToNumber = parseCurrency;

/**
 * Alias de compatibilidade — usar applyCurrencyMask de preferência
 */
export const formatCurrencyInput = applyCurrencyMask;
