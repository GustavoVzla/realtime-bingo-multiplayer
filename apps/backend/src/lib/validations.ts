/**
 * Backend validation utilities
 * Provides validation helpers for request data and business logic
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
 * Validates card IDs array and throws error if invalid
 * @param cardIds - Array of card IDs to validate
 * @throws Error with descriptive message if validation fails
 *
 * @example
 * validateCardIds(['67e2425d-b7fe-47b9-b76e-bd3076cf4c97']) // passes
 * validateCardIds(['invalid-id']) // throws Error
 * validateCardIds([]) // throws Error
 */
export function validateCardIds(cardIds: string[]): void {
  if (!cardIds || !Array.isArray(cardIds)) {
    throw new Error('Card IDs must be provided as an array');
  }

  if (cardIds.length === 0) {
    throw new Error('At least one card must be selected');
  }

  // Check for invalid UUIDs
  const invalidIds = cardIds.filter((id) => !isValidUUID(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid card ID format: ${invalidIds[0]}`);
  }
}

/**
 * Validates session ID and throws error if invalid
 * @param sessionId - Session ID to validate
 * @throws Error with descriptive message if validation fails
 */
export function validateSessionId(sessionId: string): void {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('Session ID is required');
  }

  if (!isValidUUID(sessionId)) {
    throw new Error(`Invalid session ID format: ${sessionId}`);
  }
}

/**
 * Validates player ID and throws error if invalid
 * @param playerId - Player ID to validate
 * @throws Error with descriptive message if validation fails
 */
export function validatePlayerId(playerId: string): void {
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Player ID is required');
  }

  if (!isValidUUID(playerId)) {
    throw new Error(`Invalid player ID format: ${playerId}`);
  }
}

/**
 * Validates payment ID and throws error if invalid
 * @param paymentId - Payment ID to validate
 * @throws Error with descriptive message if validation fails
 */
export function validatePaymentId(paymentId: string): void {
  if (!paymentId || typeof paymentId !== 'string') {
    throw new Error('Payment ID is required');
  }

  if (!isValidUUID(paymentId)) {
    throw new Error(`Invalid payment ID format: ${paymentId}`);
  }
}
