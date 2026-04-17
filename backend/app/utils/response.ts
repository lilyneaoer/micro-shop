/**
 * Unified API response format utility
 * Requirement 11.1: All API responses use unified JSON structure { code, message, data }
 */

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * Format a successful API response
 * @param data - The response payload
 * @param message - Optional success message (defaults to 'success')
 * @returns Formatted API response object
 */
export function formatResponse<T = unknown>(data: T, message = 'success'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  };
}

/**
 * Format an error API response
 * @param code - Error code (non-zero)
 * @param message - Error description
 * @param data - Optional error data (defaults to null)
 * @returns Formatted API response object
 */
export function formatError<T = null>(
  code: number,
  message: string,
  data: T = null as unknown as T,
): ApiResponse<T> {
  return {
    code,
    message,
    data,
  };
}

/**
 * Standard error codes as defined in the design document
 */
export const ErrorCode = {
  SUCCESS: 0,
  VALIDATION_ERROR: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  INVALID_STATUS_TRANSITION: 1005,
  RATE_LIMIT_EXCEEDED: 1006,
  ACCOUNT_LOCKED: 2001,
  INVALID_CREDENTIALS: 2002,
  DISH_UNAVAILABLE: 3001,
  DISH_HAS_ACTIVE_ORDERS: 3002,
  WECHAT_PAY_FAILED: 4001,
  PAYMENT_SIGNATURE_INVALID: 4002,
  REFUND_AMOUNT_EXCEEDED: 4003,
  TABLE_UNAVAILABLE: 5001,
  SESSION_EXPIRED: 5002,
  INTERNAL_SERVER_ERROR: 9999,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
