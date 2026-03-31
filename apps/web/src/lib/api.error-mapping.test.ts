import { describe, expect, it } from "vitest";
import { ApiError, ERROR_CODES, isRetryableError, normalizeHumanMessage } from "./api";

describe("normalizeHumanMessage", () => {
  it("maps step-up codes to friendly MFA message", () => {
    expect(normalizeHumanMessage(403, ERROR_CODES.STEP_UP_REQUIRED)).toBe(
      "Please verify your identity with MFA to continue."
    );
  });

  it("maps expired step-up code to re-verify message", () => {
    expect(normalizeHumanMessage(403, ERROR_CODES.STEP_UP_EXPIRED)).toBe(
      "Your verification expired. Please complete MFA again."
    );
  });

  it("maps status-only 401 to sign-in message", () => {
    expect(normalizeHumanMessage(401)).toBe(
      "Your session has expired. Please sign in again."
    );
  });

  it("maps status-only 429 to retry message", () => {
    expect(normalizeHumanMessage(429)).toBe(
      "Too many requests. Please wait a moment and try again."
    );
  });

  it("maps status-only 500 to generic safe server message", () => {
    expect(normalizeHumanMessage(500)).toBe(
      "Something went wrong. Please try again shortly."
    );
  });

  it("uses code mapping over status fallback when code is recognized", () => {
    expect(normalizeHumanMessage(500, ERROR_CODES.BACKEND_UNAVAILABLE)).toBe(
      "Service is temporarily unavailable. Please try again."
    );
  });
});

describe("isRetryableError", () => {
  it("returns true for transient upstream api errors", () => {
    const err = new ApiError({
      status: 503,
      userMessage: "Service unavailable",
      code: ERROR_CODES.BACKEND_UNAVAILABLE,
    });
    expect(isRetryableError(err)).toBe(true);
  });

  it("returns false for authorization errors", () => {
    const err = new ApiError({
      status: 403,
      userMessage: "Forbidden",
      code: ERROR_CODES.FORBIDDEN,
    });
    expect(isRetryableError(err)).toBe(false);
  });

  it("returns true for network-level TypeError", () => {
    expect(isRetryableError(new TypeError("Network error"))).toBe(true);
  });
});
