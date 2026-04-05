# VaultGuard AI

> AI-powered SaaS access governance agent built on Auth0 Token Vault

VaultGuard connects to your Slack workspace and GitHub organization, continuously scans for access anomalies (stale admins, over-permissioned bots, shadow apps), and remediates them — with your approval — using Auth0 CIBA.

## Built for

**Authorized to Act: Auth0 for AI Agents Hackathon**

## Auth0 Features Used

| Feature | How We Use It |
|---------|--------------|
| **Token Vault** | Stores Slack + GitHub OAuth refresh tokens. Provider credentials never touch our database. Agents call token exchange (RFC 8693) for fresh access tokens. |
| **Connected Accounts** | One-time OAuth consent flow per provider. Admin connects once, Token Vault handles refresh forever. |
| **CIBA** | Human-in-the-loop approval before every remediation. Admin receives email, clicks Approve/Reject. No autonomous actions without consent. |
| **FGA** | Fine-grained authorization via OpenFGA. Only org admins can approve critical remediations. Policy enforced at API layer, not in application code. |
| **Step-Up Auth** | MFA required before any remediation action. Prevents session hijacking from triggering irreversible changes. |
| **Universal Login** | Admin authentication with SSO support. JWT RS256 validation via JWKS. |

## How It Works

```
Connect → Scan → Analyze → CIBA Approve → Execute → Audit
```

1. **Connect** — Admin connects Slack + GitHub via Auth0 Connected Accounts
2. **Scan** — AI agent fetches workspace data using Token Vault (credentials never stored locally)
3. **Analyze** — Claude Sonnet calculates a 0-100 risk score and generates per-finding recommendations in plain English
4. **Remediate** — Admin clicks "Remediate" → step-up MFA verification → CIBA sends approval email → admin approves → action executes
5. **Audit** — Every action logged: who requested, who approved, what was done, when

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, Recharts |
| Backend | NestJS, TypeScript |
| AI | Claude Sonnet (Anthropic) |
| Auth | Auth0 (Token Vault, CIBA, FGA, Universal Login) |
| Database | Supabase (PostgreSQL) |
| Monorepo | Turborepo, pnpm workspaces |
| Deploy | Vercel (web) + Railway (api) |

## Features

- **Slack scanning** — Stale admins, deactivated users with admin flags, shadow apps with broad OAuth scopes
- **GitHub scanning** — Outside collaborators, org-wide app installations, inactive org owners
- **AI risk scoring** — 0-100 score with weighted severity calculation
- **Plain English recommendations** — Claude Sonnet generates specific, actionable advice per finding
- **Step-up authentication** — MFA required before any remediation (prevents session hijacking)
- **CIBA remediation** — One-click remediate → email approval → auto-execute
- **Safe remediation scope** — Only supported auto-remediation actions execute; unsupported actions fail closed
- **Real-time dashboard** — SSE-powered live scan feed
- **Full audit trail** — Immutable log of every scan, approval, and action
- **Daily auto-scan** — Cron scheduler runs scans at midnight UTC
- **Dark-first design** — Security-tool aesthetic inspired by Wiz, Datadog, Vercel
- **Responsive** — Mobile sidebar, tablet and desktop layouts

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 8+
git clone https://github.com/YOUR_USERNAME/vaultguard-ai.git
cd vaultguard-ai

# Run setup (checks prereqs, installs deps, builds)
./scripts/setup-local.sh

# Configure environment variables (each app has its own .env.example)
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# Fill in your keys — see docs/FRONTEND_ENV_SETUP.md & docs/BACKEND_ENV_SETUP.md

# Set up database (run in Supabase SQL Editor)
# scripts/setup-database.sql    — schema
# scripts/seed-demo.sql         — demo data (optional)

# Deploy FGA authorization model
./scripts/setup-fga-model.sh

# Start development (web + api)
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

For full setup details and provider configuration, use [docs/setup.md](docs/setup.md).

## Environment Checklist (Security-Critical)

Use this checklist before demos, staging, or production deploys.

- [ ] Required web and API keys are populated (see [docs/ENV_VARS_REFERENCE.md](docs/ENV_VARS_REFERENCE.md)).
- [ ] `AUTH0_BASE_URL` and `FRONTEND_URL` match the deployed web origin.
- [ ] `NEXT_PUBLIC_API_URL` points to the active backend deployment.
- [ ] `ALLOW_INSECURE_DEV_AUTH=false` outside local development.
- [ ] `ENABLE_DEMO_ENDPOINTS=false` outside explicit demo/local contexts.
- [ ] Remediation retries use `x-idempotency-key` for duplicate protection.

## Project Structure

```
vaultguard-ai/
├── .github/workflows/    # CI pipeline (lint, build, audit)
├── apps/
│   ├── web/                # Next.js 16 frontend
│   │   ├── src/app/        # App Router pages
│   │   ├── src/components/ # UI + feature components
│   │   └── src/lib/        # Auth0, API client, utils
│   └── api/                # NestJS backend
│       └── src/
│           ├── auth/       # JWT validation, FGA guard
│           ├── slack/      # Token Vault + Slack API
│           ├── github/     # Token Vault + GitHub API
│           ├── ai/         # Claude Sonnet analysis
│           ├── scanning/   # Orchestrator + scheduler
│           ├── remediation/# CIBA service + execution
│           ├── dashboard/  # Summary API + SSE
│           ├── findings/   # CRUD + filters
│           ├── audit/      # Append-only logging
│           └── common/     # Supabase + Token Vault services
├── packages/
│   └── shared/             # Shared TypeScript types
├── scripts/
│   ├── setup-local.sh      # Local dev setup
│   ├── setup-database.sql  # Database schema
│   ├── setup-retention.sql # Data retention policy (90d audit, 30d scans)
│   ├── seed-database.sql   # Test data
│   ├── seed-demo.sql       # Demo data (10 findings)
│   ├── setup-fga-model.sh  # FGA authorization model
│   ├── deploy-web.sh       # Vercel deployment
│   └── deploy-api.sh       # Railway deployment
├── docs/
│   ├── README.md                 # Documentation index and maintenance map
│   ├── setup.md                  # Setup guide
│   ├── deployment.md             # Deployment and operations guide
│   ├── architecture.md           # System architecture and data flow
│   ├── ARCHITECTURE_STANDARDS.md # Engineering standards
│   ├── SECURITY_AUDIT.md         # Security hardening record
│   ├── PLAN.md                   # Historical implementation plan
│   ├── blog-post.md              # Hackathon blog post draft
│   └── adr/                      # Architecture decision records
├── apps/web/.env.example   # Frontend env template
└── apps/api/.env.example   # Backend env template
```

## Documentation

### Getting Started

- [Documentation Index](docs/README.md) — complete map of docs and maintenance expectations
- [Setup Guide](docs/setup.md) — local setup, provider onboarding, and migration ordering
- [Environment Variables Reference](docs/ENV_VARS_REFERENCE.md) — canonical key descriptions and requiredness
- [Troubleshooting](docs/TROUBLESHOOTING.md) — high-signal diagnosis for setup/auth/deploy issues

### Development

- [Contributing Guide](CONTRIBUTING.md) — branching, commit style, PR checklist, and CI expectations
- [Architecture](docs/architecture.md) — system design, trust boundaries, and module map
- [Architecture Standards](docs/ARCHITECTURE_STANDARDS.md) — coding/security/testing/delivery rules
- [API Reference](docs/API_REFERENCE.md) — endpoint groups, error envelope, and auth expectations
- [Testing Guide](docs/TESTING.md) — current test commands and validation workflow

### Deployment and Operations

- [Deployment Guide](docs/deployment.md) — preflight checks, rollout order, rollback, and verification
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md) — release triage and incident response baseline
- [Security Audit](docs/SECURITY_AUDIT.md) — security hardening record and remediation history

### Governance and History

- [ADR Guidelines](docs/adr/README.md) — architecture decision process
- [ADR Template](docs/adr/0000-template.md) — starting point for new ADRs
- [Implementation Plan (Historical)](docs/PLAN.md) — historical implementation record
- [Blog Post Draft](docs/blog-post.md) — hackathon narrative draft

### Where Do I...?

| Task | Canonical doc |
|---|---|
| Set up local development | [docs/setup.md](docs/setup.md) |
| Configure environment variables correctly | [docs/ENV_VARS_REFERENCE.md](docs/ENV_VARS_REFERENCE.md) |
| Debug login, CORS, or provider integration failures | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| Understand architecture boundaries | [docs/architecture.md](docs/architecture.md) |
| Follow coding/security/testing standards | [docs/ARCHITECTURE_STANDARDS.md](docs/ARCHITECTURE_STANDARDS.md) |
| Find backend endpoints and error codes | [docs/API_REFERENCE.md](docs/API_REFERENCE.md) |
| Run quality checks and tests | [docs/TESTING.md](docs/TESTING.md) |
| Prepare and execute deployments | [docs/deployment.md](docs/deployment.md) |
| Handle release incidents and rollback | [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) |
| Propose a non-trivial architecture change | [docs/adr/README.md](docs/adr/README.md) |
| Review historical implementation context | [docs/PLAN.md](docs/PLAN.md) |

## Security Architecture

VaultGuard is designed around the principle of **delegated trust**:

- **Token Vault** is the security boundary — OAuth refresh tokens never leave Auth0's infrastructure
- **Step-up auth** verifies admin identity with MFA before any high-stakes action
- **CIBA** ensures no AI agent acts without human approval — every remediation requires explicit consent
- **FGA** enforces authorization policies at the API layer via `FgaGuard` — fail-closed in production, not in application-level if/else blocks
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Audit logs** are append-only — immutable compliance-ready trail
- **Agent transparency** — users can see exactly what data the agent accessed and which scopes it holds

If VaultGuard's database is breached, there are no usable OAuth credentials to steal.

## License

MIT
