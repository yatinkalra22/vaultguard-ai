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

# Configure environment variables
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
# Edit both files with your Auth0, Supabase, and Anthropic values

# Set up database (run in Supabase SQL Editor)
# scripts/setup-database.sql    — schema
# scripts/seed-demo.sql         — demo data (optional)

# Deploy FGA authorization model
./scripts/setup-fga-model.sh

# Start development
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

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
│   ├── architecture.md     # System design + Auth0 feature map
│   └── setup.md            # Full setup guide
└── .env.example            # Environment variable template
```

## Documentation

- [Architecture](docs/architecture.md) — System design, Auth0 feature map, Token Vault flow, database schema
- [Setup Guide](docs/setup.md) — Auth0 tenant config, Supabase, Slack/GitHub apps, deployment

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
