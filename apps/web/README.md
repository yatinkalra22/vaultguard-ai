# VaultGuard Web

Frontend for VaultGuard AI, built with Next.js App Router.

## Commands

Run from the monorepo root.

```bash
pnpm -C apps/web dev
pnpm -C apps/web build
pnpm -C apps/web lint
```

Default local URL: http://localhost:3000

## Environment

Copy root env template values into:

- apps/web/.env.local

Required keys:

- AUTH0_SECRET
- AUTH0_BASE_URL
- AUTH0_ISSUER_BASE_URL
- AUTH0_CLIENT_ID
- AUTH0_CLIENT_SECRET
- AUTH0_AUDIENCE
- NEXT_PUBLIC_API_URL

## Security Checklist

- `AUTH0_BASE_URL` must match the deployed web origin (no localhost in shared envs).
- API now rejects unauthenticated telemetry, so web telemetry is routed via `/api/proxy/telemetry`.
- Keep `ALLOW_INSECURE_DEV_AUTH` disabled outside local development.
- Keep `ENABLE_DEMO_ENDPOINTS` disabled outside explicit demo environments.

## Key Routes

- Dashboard: / 
- Findings: /findings
- Integrations: /integrations
- Audit Log: /audit-log
- Settings: /settings

## Notes

- API requests are proxied through /api/proxy/* so access tokens stay server-side.
- Auth is handled by @auth0/nextjs-auth0 middleware and route handlers.
