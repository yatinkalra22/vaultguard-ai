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

## Key Routes

- Dashboard: / 
- Findings: /findings
- Integrations: /integrations
- Audit Log: /audit-log
- Settings: /settings

## Notes

- API requests are proxied through /api/proxy/* so access tokens stay server-side.
- Auth is handled by @auth0/nextjs-auth0 middleware and route handlers.
