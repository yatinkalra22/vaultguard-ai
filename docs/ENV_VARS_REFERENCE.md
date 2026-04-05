# VaultGuard AI — Environment Variables Reference

Each app has its own `.env.example` with only the variables it needs:

- **Frontend:** `apps/web/.env.example` → copy to `apps/web/.env.local`
- **Backend:** `apps/api/.env.example` → copy to `apps/api/.env`

Step-by-step setup guides: [FRONTEND_ENV_SETUP.md](./FRONTEND_ENV_SETUP.md) | [BACKEND_ENV_SETUP.md](./BACKEND_ENV_SETUP.md)

## Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `AUTH0_SECRET` | Yes | Session encryption secret. Generate with `openssl rand -hex 32`. |
| `AUTH0_BASE_URL` | Yes | Public web origin (e.g., `http://localhost:3000`). |
| `AUTH0_ISSUER_BASE_URL` | Yes | Auth0 tenant URL with `https://` prefix. |
| `AUTH0_DOMAIN` | Optional | Auth0 domain without `https://`. Used as fallback. |
| `AUTH0_CLIENT_ID` | Yes | Auth0 application client ID. |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 application client secret. |
| `AUTH0_AUDIENCE` | Yes | API audience for access tokens (`https://api.vaultguard.ai`). |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (e.g., `http://localhost:4000`). |

## Backend (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | API listen port (default: `4000`). |
| `NODE_ENV` | Yes | `development` or `production`. Production enforces strict startup checks. |
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain for JWT validation. |
| `AUTH0_AUDIENCE` | Yes | Expected JWT audience (`https://api.vaultguard.ai`). |
| `AUTH0_CLIENT_ID` | Yes | Auth0 client ID for Token Vault and CIBA operations. |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 client secret for Token Vault and CIBA operations. |
| `FGA_STORE_ID` | Yes (for FGA) | OpenFGA store identifier. |
| `FGA_CLIENT_ID` | Yes (for FGA) | OpenFGA API client ID. |
| `FGA_CLIENT_SECRET` | Yes (for FGA) | OpenFGA API client secret. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS — never expose in frontend). |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude AI risk analysis. |
| `FRONTEND_URL` | Yes | Exact allowed CORS origin. Must match frontend URL (no trailing slash). |
| `AUTH0_BASE_URL` | Yes | Web base URL for auth redirect/callback flows. |
| `DEFAULT_GITHUB_ORG` | Optional | Fallback GitHub org for scheduled/manual scans. |

## Shared Auth0 Credentials

The frontend and backend use the **same Auth0 application**, so these values are identical in both files:

| Variable | Same Value? |
|----------|:-----------:|
| `AUTH0_DOMAIN` / `AUTH0_ISSUER_BASE_URL` | Yes (same tenant, different format) |
| `AUTH0_CLIENT_ID` | Yes |
| `AUTH0_CLIENT_SECRET` | Yes |
| `AUTH0_AUDIENCE` | Yes |

## Security Flags (Backend Only)

| Variable | Local | Staging/Prod | Notes |
|---|---|---|---|
| `ALLOW_INSECURE_DEV_AUTH` | Yes (temporary) | Never | Bypasses MFA/FGA for local dev. Production blocks startup if `true`. |
| `ENABLE_DEMO_ENDPOINTS` | Yes (demo) | Never | Enables demo-seed/reset endpoints. Production blocks startup if `true`. |

## Common Pitfalls

- `AUTH0_ISSUER_BASE_URL` needs `https://` prefix; `AUTH0_DOMAIN` does not.
- `FRONTEND_URL` and `AUTH0_BASE_URL` usually share the same origin but protect different concerns (CORS vs. auth redirects).
- Mismatch between `NEXT_PUBLIC_API_URL` and the backend's actual deploy URL causes proxy/API failures.
- `NEXT_PUBLIC_*` vars require a full server restart after changes (Next.js inlines them at build time).
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — never expose in client-side code.
