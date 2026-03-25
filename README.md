# VaultGuard AI

> AI-powered SaaS access governance agent built on Auth0 Token Vault

VaultGuard connects to your Slack workspace and GitHub organization, continuously scans for access anomalies (stale users, over-permissioned bots, shadow apps), and remediates them — with your approval — using Auth0 CIBA.

## Built for

**Authorized to Act: Auth0 for AI Agents Hackathon**

## Auth0 Features Used

- **Token Vault** — Secure OAuth token storage for Slack + GitHub. Provider refresh tokens never touch our database.
- **Connected Accounts** — One-time OAuth consent flow per provider.
- **CIBA** — Human-in-the-loop approval before every remediation action.
- **FGA** — Role-based access control for remediation approvals.
- **Universal Login** — Admin authentication with SSO support.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, Tailwind CSS, shadcn/ui, Recharts |
| Backend | NestJS, TypeScript |
| AI | Claude Sonnet (Anthropic) |
| Auth | Auth0 (Token Vault, CIBA, FGA, Universal Login) |
| Database | Supabase (PostgreSQL) |
| Monorepo | Turborepo, pnpm workspaces |
| Deploy | Vercel (web) + Railway (api) |

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 8+
pnpm install
pnpm dev

# Web: http://localhost:3000
# API: http://localhost:4000
```

## Documentation

- [Architecture](docs/architecture.md) — System design, Auth0 feature map, database schema
- [Setup Guide](docs/setup.md) — Full setup instructions for local dev and deployment

## How It Works

1. **Connect** — Admin connects Slack + GitHub via Auth0 Connected Accounts
2. **Scan** — AI agent fetches workspace data using Token Vault (credentials never stored locally)
3. **Analyze** — Claude Sonnet calculates risk score and generates per-finding recommendations
4. **Remediate** — Admin clicks "Remediate" → CIBA sends approval request → admin approves → action executes
5. **Audit** — Every action logged with who requested, who approved, and when

## Project Structure

```
vaultguard-ai/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared TypeScript types
├── docs/             # Architecture, setup guides
├── scripts/          # Deployment and setup scripts
└── .env.example      # Environment variable template
```

## License

MIT
