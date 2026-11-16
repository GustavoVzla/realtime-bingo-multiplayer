/**
 * Frontend validation utilities
 * Provides validation helpers for forms and data integrity
 */

/**
 * UUID v4 validation regex
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4
 * @param value - The string to validate
 * @returns True if the string is a valid UUID v4, false otherwise
 *
 * @example
 * isValidUUID('67e2425d-b7fe-47b9-b76e-bd3076cf4c97') // true
 * isValidUUID('card-test-ui-1') // false
 * isValidUUID('invalid-uuid') // false
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(value);
}

/**
 * Validates if all strings in an array are valid UUIDs
 * @param values - Array of strings to validate
 * @returns True if all strings are valid UUIDs, false otherwise
 *
 * @example
 * areValidUUIDs(['67e2425d-b7fe-47b9-b76e-bd3076cf4c97', '809a82f6-84f1-46fb-a8c1-ef3997b1ebd1']) // true
 * areValidUUIDs(['card-1', 'card-2']) // false
 */
export function areValidUUIDs(values: string[]): boolean {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }
  return values.every(isValidUUID);
}

/**
 * Filters an array to only include valid UUIDs
 * @param values - Array of strings to filter
 * @returns Array containing only valid UUIDs
 *
 * @example
 * filterValidUUIDs(['67e2425d-b7fe-47b9-b76e-bd3076cf4c97', 'invalid', '809a82f6-84f1-46fb-a8c1-ef3997b1ebd1'])
 * // Returns: ['67e2425d-b7fe-47b9-b76e-bd3076cf4c97', '809a82f6-84f1-46fb-a8c1-ef3997b1ebd1']
 */
export function filterValidUUIDs(values: string[]): string[] {
  return values.filter(isValidUUID);
}

/**
 * Validates card IDs array and returns validation result with error message
 * @param cardIds - Array of card IDs to validate
 * @returns Object with isValid boolean and optional error message
 *
 * @example
 * validateCardIds(['67e2425d-b7fe-47b9-b76e-bd3076cf4c97']) // { isValid: true }
 * validateCardIds(['invalid-id']) // { isValid: false, error: 'Invalid card ID format: invalid-id' }
 * validateCardIds([]) // { isValid: false, error: 'At least one card must be selected' }
 */
export function validateCardIds(cardIds: string[]): {
  isValid: boolean;
  error?: string;
} {
  if (!cardIds || !Array.isArray(cardIds)) {
    return {
      isValid: false,
      error: 'Card IDs must be provided as an array',
    };
  }

  if (cardIds.length === 0) {
    return {
      isValid: false,
      error: 'At least one card must be selected',
    };
  }

  // Check for invalid UUIDs
  const invalidIds = cardIds.filter((id) => !isValidUUID(id));
  if (invalidIds.length > 0) {
    return {
      isValid: false,
      error: `Invalid card ID format: ${invalidIds[0]}`,
    };
  }

  return {
    isValid: true,
  };
}
