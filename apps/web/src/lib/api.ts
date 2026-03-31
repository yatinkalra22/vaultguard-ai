// WHY: Thin wrapper around fetch for calling our proxy routes.
// All requests go through /api/proxy/* which injects the Auth0 token server-side.
// This keeps the access token out of client-side JavaScript entirely.

const BASE = "/api/proxy";

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

function normalizeHumanMessage(status: number, code?: string): string {
  if (code === "step_up_required") {
    return "Please verify your identity with MFA to continue.";
  }

  if (code === "step_up_expired") {
    return "Your verification expired. Please complete MFA again.";
  }

  if (status === 400) {
    return "Please check the entered details and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "We could not find what you requested.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "Something went wrong on our side. Please try again shortly.";
  }

  return "Request failed. Please try again.";
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
  return error.code === "step_up_required" || error.code === "step_up_expired";
}

async function parseErrorBody(res: Response): Promise<unknown> {
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
    const res = await fetch(`${BASE}/${path}${query}`);
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async del<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}/${path}`, { method: "DELETE" });
    return handleResponse<T>(res);
  },
};
