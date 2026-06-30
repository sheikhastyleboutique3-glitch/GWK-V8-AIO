/**
 * Security Utilities — Centralized defensive helpers used across the system.
 *
 * Skills applied:
 * - Input sanitization (prevent XSS in stored strings)
 * - Numeric validation (prevent NaN/Infinity in financial calculations)
 * - Safe JSON parsing (never throws)
 * - Request ID extraction (for distributed tracing)
 */

/**
 * Sanitize a string value for safe storage/display.
 * Strips HTML tags and dangerous characters without breaking Arabic/Unicode.
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>]/g, '')    // strip remaining angle brackets
    .trim()
    .slice(0, 10000);        // max 10K chars (prevent payload bombing)
}

/**
 * Validate a number for financial calculations.
 * Returns 0 for NaN, Infinity, or undefined — never produces garbage math.
 */
export function safeNumber(value: number | string | null | undefined, max = 1_000_000): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  if (n > max) return max;
  if (n < -max) return -max;
  return Math.round(n * 100) / 100; // 2 decimal places for currency
}

/**
 * Safe JSON parse — never throws, returns fallback on failure.
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Extract request ID for tracing (set by middleware in main.ts).
 */
export function getRequestId(req: any): string {
  return req?.requestId || req?.headers?.['x-request-id'] || 'unknown';
}

/**
 * Mask sensitive data for logging (shows first/last 2 chars only).
 * Used for audit logs when handling tokens, PINs, card numbers.
 */
export function maskSensitive(value: string | null | undefined): string {
  if (!value || value.length < 4) return '****';
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 20))}${value.slice(-2)}`;
}

/**
 * Validate that an array of IDs contains only positive integers.
 * Prevents injection of negative/float/string values in bulk operations.
 */
export function validateIds(ids: any[]): number[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}
