export const ERROR_CODES = {
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  VALIDATION_FAILED: 'validation_failed',
  NOT_FOUND: 'not_found',
  RATE_LIMITED: 'rate_limited',
  STEP_UP_REQUIRED: 'step_up_required',
  STEP_UP_EXPIRED: 'step_up_expired',
  INTERNAL_ERROR: 'internal_error',
  BACKEND_UNAVAILABLE: 'backend_unavailable',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function defaultCodeForStatus(status: number): ErrorCode {
  if (status === 400) return ERROR_CODES.VALIDATION_FAILED;
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  return ERROR_CODES.INTERNAL_ERROR;
}
