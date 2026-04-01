# VaultGuard AI - Deployment Guide

This guide is the canonical deployment and release operations reference.

For local setup use [setup.md](./setup.md).
For full environment variable definitions use [ENV_VARS_REFERENCE.md](./ENV_VARS_REFERENCE.md).

## Scope

- Frontend: Vercel via `scripts/deploy-web.sh`
- Backend: Railway via `scripts/deploy-api.sh`

## Deployment order

1. Deploy backend first.
2. Verify backend health and auth-protected API access.
3. Deploy frontend.
4. Verify frontend proxy and end-to-end auth/remediation flows.

## Preflight checklist

Before every deployment:

- CI is green on the target commit.
- `pnpm build` passes locally from repository root.
- Required production env vars are set in platform dashboards.
- `ALLOW_INSECURE_DEV_AUTH=false` in shared/staging/production environments.
- `ENABLE_DEMO_ENDPOINTS=false` in shared/staging/production environments.

## Required environment variables

The lists below are the production minimum subset. Canonical variable definitions and local/staging differences live in [ENV_VARS_REFERENCE.md](./ENV_VARS_REFERENCE.md).

### Frontend (Vercel)

- `AUTH0_SECRET`
- `AUTH0_BASE_URL` (must match deployed web origin)
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_AUDIENCE`
- `NEXT_PUBLIC_API_URL` (backend base URL)

### Backend (Railway)

- `PORT`
- `NODE_ENV=production`
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_BASE_URL` (web base URL for redirect/callback flows)
- `FRONTEND_URL` (exact web origin for CORS)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `FGA_STORE_ID`
- `FGA_CLIENT_ID`
- `FGA_CLIENT_SECRET`

## Deploy frontend (Vercel)

```bash
# Preview deployment
./scripts/deploy-web.sh

# Production deployment
./scripts/deploy-web.sh --prod
```

## Deploy backend (Railway)

```bash
./scripts/deploy-api.sh
```

## Post-deployment verification

Run these checks in order:

1. `GET /api/health` returns healthy status from backend.
2. Login flow works through Auth0 Universal Login.
3. API proxy calls from web to backend succeed for authenticated user.
4. CORS allows only configured `FRONTEND_URL`.
5. Manual scan trigger succeeds.
6. Remediation request path enforces step-up and authorization checks.
7. `ALLOW_INSECURE_DEV_AUTH=false` and `ENABLE_DEMO_ENDPOINTS=false` are enforced.

## Rollback strategy

If release validation fails:

1. Roll back frontend to previous healthy Vercel deployment.
2. Roll back backend to previous healthy Railway deployment.
3. Re-check `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` pairing to avoid cross-version mismatch.
4. If issue is data-path related, disable risky operations by setting `ENABLE_DEMO_ENDPOINTS=false` and confirming auth/security flags remain strict.

## Environment variable intent (critical pair)

- `FRONTEND_URL` (backend): exact web origin allowed by CORS (for example `https://app.example.com`).
- `AUTH0_BASE_URL` (web + backend): canonical web origin used in Auth0 redirect/callback flow calculations.

Both usually point to the same production web origin, but they are validated independently because they protect different runtime concerns (CORS vs callback/redirect correctness).

## Operations best practices

- Use preview deployments for every PR before production rollout.
- Keep production auth and security flags immutable via platform-managed secrets.
- Apply least privilege to provider scopes and rotate secrets regularly.
- Track deployment metadata in release notes: commit SHA, deploy time, owner, and verification status.
