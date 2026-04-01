# VaultGuard AI — Testing Guide

This document describes current test commands and expected validation workflow.

## Current state

- Web has unit tests via Vitest.
- API does not yet expose a dedicated test script in package scripts.
- CI enforces lint, typecheck, build, and dependency audit.

## Commands

Run from repository root.

```bash
# Workspace quality gates
pnpm lint
pnpm build

# Web unit tests
pnpm --filter @vaultguard/web test:unit
```

## What to validate for backend changes

Until API test scripts are added, validate backend changes with:

1. `pnpm --filter @vaultguard/api lint`
2. `pnpm --filter @vaultguard/api build`
3. Run app locally and verify target endpoint behavior manually.
4. Verify `/api/health` and affected auth-protected routes.

## Recommended test layers (target architecture)

These standards are required by `docs/ARCHITECTURE_STANDARDS.md` and should be implemented incrementally:

- Unit tests: domain and policy logic
- Contract tests: controller DTO validation and error envelopes
- Adapter tests: Slack/GitHub/Auth0 integration clients
- Workflow tests: scan and remediation state transitions

## Critical-path verification checklist

For security-sensitive or remediation changes:

- Step-up enforcement remains required on remediation operations.
- FGA checks remain fail-closed in production.
- `requestId` is present in errors/logs for traceability.
- Unsupported remediation actions fail closed.
- Audit write paths remain intact for request, approval/rejection, execution.

## CI reference

CI pipeline definition: `.github/workflows/ci.yml`.

When adding new tests, integrate them into CI before relying on them as quality gates.
