/**
 * Snowflake-style ID generator
 * Format: YYYYMMDD-HHmmss-<random>
 * Example: 20240215-163045-a1b2c3
 *
 * Benefits:
 * - Sortable by creation time
 * - Human-readable timestamp prefix
 * - Unique across instances
 * - URL-safe
 */

/**
 * Generate a random alphanumeric string
 * @param length Length of the random string (default: 6)
 * @returns Random string (lowercase alphanumeric)
 */
function generateRandomString(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format date to YYYYMMDD-HHmmss
 * @param date Date object (default: now)
 * @returns Formatted timestamp string
 */
function formatTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Generate a Snowflake-style ID
 * Format: YYYYMMDD-HHmmss-<random>
 *
 * @param randomLength Length of random suffix (default: 6)
 * @returns Snowflake-style ID
 *
 * @example
 * snowflakeId() // => "20240215-163045-a1b2c3"
 * snowflakeId(8) // => "20240215-163045-a1b2c3d4"
 */
export function snowflakeId(randomLength: number = 6): string {
  const timestamp = formatTimestamp();
  const random = generateRandomString(randomLength);
  return `${timestamp}-${random}`;
}

/**
 * Generate a compact Snowflake-style ID (no hyphens)
 * Format: YYYYMMDDHHmmss<random>
 *
 * @param randomLength Length of random suffix (default: 6)
 * @returns Compact snowflake ID
 *
 * @example
 * compactSnowflakeId() // => "20240215163045a1b2c3"
 */
export function compactSnowflakeId(randomLength: number = 6): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const random = generateRandomString(randomLength);

  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

/**
 * Extract timestamp from a Snowflake ID
 * @param id Snowflake ID
 * @returns Date object or null if invalid
 *
 * @example
 * extractTimestamp("20240215-163045-a1b2c3") // => Date(2024-02-15 16:30:45)
 */
export function extractTimestamp(id: string): Date | null {
  try {
    // Format: YYYYMMDD-HHmmss-<random>
    const parts = id.split('-');
    if (parts.length < 2) {
      // Try compact format: YYYYMMDDHHmmss<random>
      if (id.length >= 14) {
        const year = parseInt(id.substring(0, 4));
        const month = parseInt(id.substring(4, 6)) - 1;
        const day = parseInt(id.substring(6, 8));
        const hours = parseInt(id.substring(8, 10));
        const minutes = parseInt(id.substring(10, 12));
        const seconds = parseInt(id.substring(12, 14));
        return new Date(year, month, day, hours, minutes, seconds);
      }
      return null;
    }

    const datePart = parts[0]; // YYYYMMDD
    const timePart = parts[1]; // HHmmss

    const year = parseInt(datePart.substring(0, 4));
    const month = parseInt(datePart.substring(4, 6)) - 1;
    const day = parseInt(datePart.substring(6, 8));
    const hours = parseInt(timePart.substring(0, 2));
    const minutes = parseInt(timePart.substring(2, 4));
    const seconds = parseInt(timePart.substring(4, 6));

    return new Date(year, month, day, hours, minutes, seconds);
  } catch {
    return null;
  }
}

/**
 * Check if a string is a valid Snowflake ID
 * @param id String to check
 * @returns True if valid Snowflake ID
 *
 * @example
 * isSnowflakeId("20240215-163045-a1b2c3") // => true
 * isSnowflakeId("invalid") // => false
 */
export function isSnowflakeId(id: string): boolean {
  // Standard format: YYYYMMDD-HHmmss-<random>
  const standardPattern = /^\d{8}-\d{6}-[a-z0-9]+$/;
  // Compact format: YYYYMMDDHHmmss<random>
  const compactPattern = /^\d{14}[a-z0-9]+$/;

  return standardPattern.test(id) || compactPattern.test(id);
}
