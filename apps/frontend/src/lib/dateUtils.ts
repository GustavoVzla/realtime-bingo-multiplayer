/**
 * Date utility functions for handling timezone-aware date operations
 */

/**
 * Get today's date in YYYY-MM-DD format in the user's local timezone
 * Fixes timezone bug where new Date().toISOString() returns UTC date
 *
 * @returns Date string in YYYY-MM-DD format (e.g., "2024-03-15")
 *
 * @example
 * // User in Venezuela (UTC-4) at 2024-03-15 23:00 local time
 * new Date().toISOString().split('T')[0] // Returns "2024-03-16" (WRONG - UTC date)
 * getLocalDateString() // Returns "2024-03-15" (CORRECT - local date)
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get max date string for date input (today in local timezone)
 * Prevents users from selecting future dates
 */
export function getMaxDateString(): string {
  return getLocalDateString();
}
