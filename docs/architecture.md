# VaultGuard AI — Architecture

## Overview

VaultGuard AI is an AI-powered SaaS access governance agent. A security admin connects their Slack workspace and GitHub organization. VaultGuard's AI agent continuously scans both platforms, detects access anomalies (stale users, over-permissioned bots, shadow apps), and asks the admin for approval via CIBA before taking any remediation action.

Terminology used in this document:
- Connected Accounts: the user consent flow to connect provider identities.
- Token Vault: secure provider token storage and token exchange boundary.
- Remediation: an approved action request to reduce risk on a specific finding.
- Safe remediation: only explicitly supported action types execute; unsupported actions fail closed.

## Architecture Governance

- Documentation index: `docs/README.md`
- Engineering and architecture standards: `docs/ARCHITECTURE_STANDARDS.md`
- Architecture Decision Records (ADR): `docs/adr/`
- Deployment and runtime operations: `docs/deployment.md`

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Admin)                              │
│              Next.js 16 App Router  (Vercel)                        │
│   Dashboard │ Findings │ Integrations │ Audit Log │ Settings        │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / REST + SSE
┌────────────────────────────▼────────────────────────────────────────┐
│                    BACKEND  (Railway or Render)                     │
│                    NestJS — TypeScript                              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  AuthModule  │  │  ScanModule  │  │   AIModule   │              │
│  │  (Auth0 JWT) │  │  (Scheduler) │  │  (Claude)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ SlackModule  │  │ GitHubModule │  │ AlertsModule │              │
│  │ (Token Vault)│  │ (Token Vault)│  │   (CIBA)     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐                                 │
│  │   FGAModule  │  │  AuditModule │                                 │
│  │  (Auth0 FGA) │  │  (Postgres)  │                                 │
│  └──────────────┘  └──────────────┘                                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
┌───────▼───────┐   ┌─────────▼──────┐   ┌──────────▼────────┐
│  Auth0 Tenant │   │   Supabase     │   │   Slack + GitHub  │
│               │   │   (Postgres)   │   │   APIs            │
│  Token Vault  │   │                │   │                   │
│  CIBA         │   │  scans         │   │  Users, Apps,     │
│  FGA          │   │  findings      │   │  Permissions      │
│  Universal    │   │  audit_logs    │   │                   │
│  Login        │   │  remediations  │   │                   │
└───────────────┘   └────────────────┘   └───────────────────┘
```

## Auth0 Feature Usage

| Feature | Where Used | Why |
|---------|-----------|-----|
| **Universal Login** | Admin signs into VaultGuard | Standard SSO login |
| **Token Vault** | Stores Slack + GitHub OAuth tokens | Agents use token exchange to call APIs without exposing credentials |
| **CIBA** | Before any remediation action | Sends push/email to admin for approval before revoking access |
| **FGA** | Policy enforcement on remediation endpoints | Only Security Admins can approve GitHub org-level changes; Team Leads for Slack. FgaGuard enforced on POST /remediations. Fail-closed in production. |
| **Connected Accounts** | "Connect Slack / Connect GitHub" flow | User consents once; Token Vault handles refresh forever |

## HTTP Security Headers

All responses from the Next.js frontend include:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; ...` | Blocks XSS, unauthorized resource loading |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Limits referrer leakage |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Disables unused browser APIs |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Enforces HTTPS |

## Token Vault Flow

1. Admin logs in via Auth0 Universal Login
2. Admin clicks "Connect Slack" → Auth0 Connected Accounts OAuth flow
3. Slack refresh token stored in Auth0 Token Vault (never touches our DB)
4. Scan job runs → calls token exchange → gets fresh access token
5. Scan calls Slack Admin API with that token
6. Anomaly found → CIBA request sent to admin
7. Admin approves on phone → NestJS receives callback → executes remediation
8. Action logged to audit table in Supabase

## Database Schema

See `scripts/setup-database.sql` for the full schema. Key tables:
- `organizations` — Companies using VaultGuard
- `integrations` — Connected providers per org (Slack, GitHub)
- `scans` — Individual scan runs
- `findings` — Security findings from scans
- `remediations` — CIBA-based remediation requests
- `audit_logs` — Full audit trail

### Data Retention

| Table | Retention | Condition |
|-------|-----------|-----------|
| `audit_logs` | 90 days | Always deleted after 90 days |
| `scans` | 30 days | Only if all linked findings are resolved |
| `findings` | 30 days | Only if status is `remediated` or `ignored` |
| `remediations` | Kept with finding | Cascades with parent finding |

Cleanup runs daily at 3 AM UTC via `AuditRetentionService`. `scripts/setup-retention.sql` is required setup for retention procedures and can also be used with `pg_cron` as an alternative scheduler integration.

## Monorepo Structure

```
vaultguard-ai/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared TypeScript types
├── docs/             # Architecture, setup, guides
├── scripts/          # Deployment and setup scripts
├── turbo.json
├── package.json
└── .env.example
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and all PRs:

| Job | What it does |
|-----|-------------|
| **lint-and-typecheck** | `tsc --noEmit` on API, ESLint on web |
| **build** | Full Turborepo build of both apps |
| **audit** | `pnpm audit --prod` for known vulnerabilities |

Build job depends on lint passing. Concurrency group cancels stale pipeline runs.

## API Hardening

The NestJS API includes the following defense-in-depth measures (configured in `apps/api/src/main.ts`):

| Layer | Implementation |
|-------|---------------|
| **Security headers** | Helmet.js — removes X-Powered-By, adds X-DNS-Prefetch-Control, etc. |
| **Payload limits** | JSON/URL-encoded bodies capped at 1mb |
| **Request tracking** | UUID per request via `X-Request-Id` header (generated or forwarded from LB) |
| **Input validation** | `class-validator` DTOs + global `ValidationPipe` with `whitelist: true` |
| **CORS** | `FRONTEND_URL` required in production; localhost fallback only in dev |
| **Structured logging** | `nestjs-pino` — JSON in production, pretty-print in dev, auth headers redacted |

## API Rate Limiting

Global rate limit: **100 requests/minute per IP** via `@nestjs/throttler`.

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `POST /api/remediations` | 5/min | Triggers CIBA approval + external API calls |
| `POST /api/scans/trigger` | 3/min | Calls Slack/GitHub APIs + Claude AI analysis |
| `GET /api/health` | No limit | Load balancer health checks |
| `SSE /api/dashboard/events` | No limit | Long-lived connection |
| All other endpoints | 100/min | Global default |

## API Endpoints

See the backend source code for full endpoint documentation. Key groups:
- `/api/auth/*` — Authentication
- `/api/integrations/*` — Connect/disconnect providers
- `/api/scans/*` — Scan history and triggers
- `/api/findings/*` — Security findings CRUD
- `/api/remediations/*` — CIBA remediation flow
- `/api/audit-logs` — Audit trail
- `/api/dashboard/*` — Summary + SSE events
