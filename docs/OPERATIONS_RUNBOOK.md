# VaultGuard AI — Operations Runbook

Use this runbook for deploy validation, production triage, and rollback execution.

## Deployment readiness

Before release:

1. CI is green on target commit.
2. Required environment variables are present.
3. Security flags are strict (`ALLOW_INSECURE_DEV_AUTH=false`, `ENABLE_DEMO_ENDPOINTS=false`).
4. Build passes from repository root.

```bash
pnpm lint
pnpm build
```

## Standard release sequence

1. Deploy backend (`./scripts/deploy-api.sh`).
2. Verify backend health (`GET /api/health`).
3. Deploy frontend (`./scripts/deploy-web.sh --prod`).
4. Verify end-to-end login, scanning, and remediation guardrails.

## Post-release checks

- API health endpoint responds.
- Auth login and callback succeed.
- Frontend can fetch dashboard and findings.
- CORS only allows expected web origin.
- Remediation path enforces step-up and policy checks.
- Audit log records actions with request correlation.

## Incident triage

Collect first:

- timestamp
- endpoint/path
- requestId
- org scope (if applicable)
- environment (staging/prod)

Then classify:

- Authentication issue
- Authorization/FGA issue
- Provider integration issue
- Database/data integrity issue
- Deployment misconfiguration

## Common emergency actions

- Disable demo endpoints (confirm `ENABLE_DEMO_ENDPOINTS=false`).
- Confirm insecure auth bypass is disabled.
- Roll back frontend to previous healthy deployment.
- Roll back backend to previous healthy deployment.
- Re-validate `FRONTEND_URL`, `AUTH0_BASE_URL`, and `NEXT_PUBLIC_API_URL` pairing.

## Rollback trigger examples

Trigger rollback when one or more are true:

- sustained 5xx responses in core APIs
- authentication flow consistently failing
- remediation endpoint authorization bypass risk
- severe data-path regressions affecting scan/remediation writes

## Logging and tracing expectations

- Every request should include `requestId`.
- Security-sensitive failures should be diagnosable via structured logs.
- Authorization headers and access tokens must remain redacted.

## Related references

- Setup: `docs/setup.md`
- Deployment: `docs/deployment.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Security hardening record: `docs/SECURITY_AUDIT.md`
