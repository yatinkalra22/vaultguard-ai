import { describe, it, expect } from 'vitest';
import { normalizeHumanMessage, ERROR_CODES } from '@/lib/api';

describe('API Error Contract Tests', () => {
  describe('Error Message Normalization', () => {
    it('should map ERROR_CODES.STEP_UP_REQUIRED to human message', () => {
      const msg = normalizeHumanMessage(403, ERROR_CODES.STEP_UP_REQUIRED);
      expect(msg).toBe('Please verify your identity with MFA to continue.');
    });

    it('should map ERROR_CODES.STEP_UP_EXPIRED to human message', () => {
      const msg = normalizeHumanMessage(403, ERROR_CODES.STEP_UP_EXPIRED);
      expect(msg).toBe('Your verification expired. Please complete MFA again.');
    });

    it('should map ERROR_CODES.RATE_LIMITED to human message', () => {
      const msg = normalizeHumanMessage(429, ERROR_CODES.RATE_LIMITED);
      expect(msg).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('should prioritize code over status when both present', () => {
      const msg = normalizeHumanMessage(403, ERROR_CODES.INTERNAL_ERROR);
      expect(msg).toBe('Something went wrong. Please try again shortly.');
      expect(msg).not.toContain('permission');
    });

    it('should fallback to status when code not recognized', () => {
      const msg = normalizeHumanMessage(429, undefined);
      expect(msg).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('should handle 502 status fallback', () => {
      const msg = normalizeHumanMessage(502, undefined);
      expect(msg).toBe('Something went wrong. Please try again shortly.');
    });
  });

  describe('Never-Leak Technical Details', () => {
    it('should hide database errors from user message', () => {
      const msg = normalizeHumanMessage(500, ERROR_CODES.INTERNAL_ERROR);
      expect(msg).not.toContain('FOREIGN KEY');
      expect(msg).toBe('Something went wrong. Please try again shortly.');
    });

    it('should hide stack traces from user message', () => {
      const msg = normalizeHumanMessage(500, ERROR_CODES.INTERNAL_ERROR);
      expect(msg).not.toContain('at ');
      expect(msg).not.toContain('Error:');
    });

    it('should hide API provider details from validation errors', () => {
      const msg = normalizeHumanMessage(400, ERROR_CODES.VALIDATION_FAILED);
      expect(msg).toBe('Please check your input and try again.');
    });
  });

  describe('Error Code Constants', () => {
    it('should have all expected error codes defined', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('unauthorized');
      expect(ERROR_CODES.FORBIDDEN).toBe('forbidden');
      expect(ERROR_CODES.VALIDATION_FAILED).toBe('validation_failed');
      expect(ERROR_CODES.NOT_FOUND).toBe('not_found');
      expect(ERROR_CODES.RATE_LIMITED).toBe('rate_limited');
      expect(ERROR_CODES.STEP_UP_REQUIRED).toBe('step_up_required');
      expect(ERROR_CODES.STEP_UP_EXPIRED).toBe('step_up_expired');
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('internal_error');
      expect(ERROR_CODES.BACKEND_UNAVAILABLE).toBe('backend_unavailable');
    });
  });
});
