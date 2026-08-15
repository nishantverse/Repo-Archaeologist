/**
 * Utility functions for formatting scan data values.
 * Requirements: 3.2, 3.3, 4.1, 4.2, 7.5
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Converts an ISO 8601 date-time string to "DD Month YYYY, HH:MM:SS" in local timezone.
 * Example: "2025-07-05T14:32:10Z" → "05 July 2025, 14:32:10"
 */
export function formatScanDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a percentage value: clamps to 0–100, rounds to integer.
 * Returns "N/A" for null input.
 */
export function formatPercentage(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }

  if (value < 0) return '0';
  if (value > 100) return '100';
  return String(Math.round(value));
}

/**
 * Returns text unchanged if within limit, else truncates with "\u2026" indicator.
 * The truncation indicator counts toward the limit.
 */
export function truncateText(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }

  return text.slice(0, limit - 1) + '\u2026';
}
