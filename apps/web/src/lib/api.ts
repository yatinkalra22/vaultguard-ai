// WHY: Thin wrapper around fetch for calling our proxy routes.
// All requests go through /api/proxy/* which injects the Auth0 token server-side.
// This keeps the access token out of client-side JavaScript entirely.

import { toast } from "@/lib/toast";
import { telemetry } from "@/lib/telemetry";

const BASE = "/api/proxy";

export const ERROR_CODES = {
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  VALIDATION_FAILED: "validation_failed",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  STEP_UP_REQUIRED: "step_up_required",
  STEP_UP_EXPIRED: "step_up_expired",
  INTERNAL_ERROR: "internal_error",
  BACKEND_UNAVAILABLE: "backend_unavailable",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.UNAUTHORIZED]: "Your session has expired. Please sign in again.",
  [ERROR_CODES.FORBIDDEN]: "You don't have permission to perform this action.",
  [ERROR_CODES.VALIDATION_FAILED]: "Please check your input and try again.",
  [ERROR_CODES.NOT_FOUND]: "The requested resource could not be found.",
  [ERROR_CODES.RATE_LIMITED]: "Too many requests. Please wait a moment and try again.",
  [ERROR_CODES.STEP_UP_REQUIRED]: "Please verify your identity with MFA to continue.",
  [ERROR_CODES.STEP_UP_EXPIRED]: "Your verification expired. Please complete MFA again.",
  [ERROR_CODES.INTERNAL_ERROR]: "Something went wrong. Please try again shortly.",
  [ERROR_CODES.BACKEND_UNAVAILABLE]: "Service is temporarily unavailable. Please try again.",
};

type ErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  requestId?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  technicalMessage?: string;

  constructor(params: {
    status: number;
    userMessage: string;
    code?: string;
    requestId?: string;
    technicalMessage?: string;
  }) {
    super(params.userMessage);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
    this.technicalMessage = params.technicalMessage;
  }
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 250;

function pickTechnicalMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as ErrorPayload;

  if (Array.isArray(body.message)) {
    return body.message.join("; ");
  }

  if (typeof body.message === "string") {
    return body.message;
  }

  if (typeof body.error === "string") {
    return body.error;
  }

  return undefined;
}

export function normalizeHumanMessage(status: number, code?: string): string {
  if (code && code in ERROR_CODE_MESSAGES) {
    return ERROR_CODE_MESSAGES[code as ErrorCode];
  }

  if (status === 400) {
    return "Please check your input and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested resource could not be found.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return ERROR_CODE_MESSAGES[ERROR_CODES.INTERNAL_ERROR];
  }

  return "Something went wrong. Please try again.";
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function isStepUpRequiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return (
    error.code === ERROR_CODES.STEP_UP_REQUIRED ||
    error.code === ERROR_CODES.STEP_UP_EXPIRED
  );
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  // Network-level fetch failures are usually TypeError in browsers.
  return error instanceof TypeError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryDelayMs(attempt: number): number {
  return BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
}

async function requestWithRetry<T>(request: () => Promise<Response>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      const res = await request();
      return await handleResponse<T>(res);
    } catch (error) {
      attempt += 1;

      if (!isRetryableError(error) || attempt > MAX_RETRIES) {
        throw error;
      }

      // Log retry attempt
      if (error instanceof ApiError) {
        telemetry.logRetry({
          type: "retry_attempt",
          code: error.code,
          status: error.status,
          attempt,
          maxAttempts: MAX_RETRIES,
          requestId: error.requestId,
        });
      }

      await sleep(retryDelayMs(attempt));
    }
  }
}

export async function parseErrorBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => null);
  }

  const text = await res.text().catch(() => "");
  return text ? { message: text } : null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await parseErrorBody(res);
    const technicalMessage = pickTechnicalMessage(body);
    const payload = (body && typeof body === "object" ? (body as ErrorPayload) : null);
    const code = payload?.code ?? payload?.error;
    const requestId = payload?.requestId;

    throw new ApiError({
      status: res.status,
      userMessage: normalizeHumanMessage(res.status, code),
      code,
      requestId,
      technicalMessage,
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return requestWithRetry<T>(() => fetch(`${BASE}/${path}${query}`));
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRetry<T>(() =>
      fetch(`${BASE}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
    );
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRetry<T>(() =>
      fetch(`${BASE}/${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
    );
  },

  async del<T>(path: string): Promise<T> {
    return requestWithRetry<T>(() => fetch(`${BASE}/${path}`, { method: "DELETE" }));
  },
};

// Toast + Telemetry helpers for common operations
export function showErrorToast(error: unknown, action?: string) {
  if (error instanceof ApiError) {
    telemetry.logError({
      type: "api_error",
      code: error.code,
      status: error.status,
      message: error.technicalMessage || error.message,
      requestId: error.requestId,
      action,
    });

    toast.error(
      error.code === ERROR_CODES.STEP_UP_REQUIRED
        ? "Verification Required"
        : "Operation Failed",
      {
        message: error.message,
        requestId: error.requestId,
        duration: 5000,
      }
    );
  } else if (error instanceof Error) {
    telemetry.logError({
      type: "network_error",
      message: error.message,
      action,
    });

    toast.error("Something went wrong", {
      message: "Please check your connection and try again.",
      duration: 5000,
    });
  }
}

export function showSuccessToast(message: string, action?: string, duration = 3000) {
  telemetry.logSuccess({
    type: "action_completed",
    action: action || message,
  });

  toast.success(message, { duration });
}

export function showWarningToast(message: string, action?: string) {
  toast.warning(message, {
    message: action,
    duration: 4000,
  });
}
