# VaultGuard AI — Environment Variables Reference

Canonical source of variable names: `.env.example`.

Use this document for requiredness and runtime intent.

## Frontend (`apps/web/.env.local`)

| Variable | Required | Environments | Description |
|---|---|---|---|
| `AUTH0_SECRET` | Yes | local, staging, production | Session secret for Auth0 Next.js SDK. |
| `AUTH0_BASE_URL` | Yes | local, staging, production | Public web origin used for login/logout callback construction. |
| `AUTH0_ISSUER_BASE_URL` | Yes | local, staging, production | Auth0 tenant issuer URL. |
| `AUTH0_DOMAIN` | Optional | local, staging, production | Optional domain alias for compatibility paths. |
| `AUTH0_CLIENT_ID` | Yes | local, staging, production | Auth0 application client ID. |
| `AUTH0_CLIENT_SECRET` | Yes | local, staging, production | Auth0 application client secret. |
| `AUTH0_AUDIENCE` | Yes | local, staging, production | API audience used for access tokens. |
| `NEXT_PUBLIC_API_URL` | Yes | local, staging, production | Backend base URL used by frontend proxy/client. |

## Backend (`apps/api/.env`)

| Variable | Required | Environments | Description |
|---|---|---|---|
| `PORT` | Yes | local, staging, production | API listen port. |
| `NODE_ENV` | Yes | local, staging, production | Runtime mode; production enforces strict startup checks. |
| `AUTH0_DOMAIN` | Yes | local, staging, production | Auth0 tenant domain for JWT validation. |
| `AUTH0_AUDIENCE` | Yes | local, staging, production | Expected audience for JWT validation. |
| `AUTH0_CLIENT_ID` | Yes | local, staging, production | Auth0 AI client ID for connected account/token operations. |
| `AUTH0_CLIENT_SECRET` | Yes | local, staging, production | Auth0 AI client secret. |
| `FGA_STORE_ID` | Required for FGA policies | local, staging, production | OpenFGA store identifier. |
| `FGA_CLIENT_ID` | Required for FGA policies | local, staging, production | OpenFGA API client ID. |
| `FGA_CLIENT_SECRET` | Required for FGA policies | local, staging, production | OpenFGA API client secret. |
| `SUPABASE_URL` | Yes | local, staging, production | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | local, staging, production | Supabase service role key for backend operations. |
| `ANTHROPIC_API_KEY` | Yes | local, staging, production | Anthropic API key for risk analysis. |
| `FRONTEND_URL` | Yes | local, staging, production | Exact allowed CORS origin for web app. |
| `AUTH0_BASE_URL` | Yes | local, staging, production | Web base URL used in auth redirect/callback dependent flows. |
| `DEFAULT_GITHUB_ORG` | Optional | local, staging, production | Fallback org for scheduled/manual GitHub scans. |

## Security flags

| Variable | Allowed in local | Allowed in staging/prod | Notes |
|---|---|---|---|
| `ALLOW_INSECURE_DEV_AUTH` | Yes (temporary only) | No | Must be `false` outside local troubleshooting. |
| `ENABLE_DEMO_ENDPOINTS` | Yes (demo only) | No | Must be `false` in shared/staging/production. |

## Common pitfalls

- `FRONTEND_URL` and `AUTH0_BASE_URL` usually use the same origin but protect different concerns.
- Mismatch between `NEXT_PUBLIC_API_URL` and backend deploy URL causes proxy/API failures.
- Missing `AUTH0_ISSUER_BASE_URL` in web env causes login flow failures.
