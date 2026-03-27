# VaultGuard AI — Setup Guide

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 8+ (`npm install -g pnpm`)
- Git
- Auth0 account (free tier: [auth0.com](https://auth0.com))
- Supabase account (free tier: [supabase.com](https://supabase.com))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Slack workspace with admin rights (for testing)
- GitHub account with org admin rights (for testing)

## Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/vaultguard-ai.git
cd vaultguard-ai

# 2. Run the setup script (checks prereqs, installs deps, builds)
./scripts/setup-local.sh

# 3. Set up environment variables
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
# Edit both files with your Auth0, Supabase, and Anthropic values

# 4. Set up the database
# Run scripts/setup-database.sql in your Supabase SQL editor
# Optionally run scripts/seed-database.sql for test data

# 5. Deploy FGA authorization model
./scripts/setup-fga-model.sh

# 6. Start development
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

## Auth0 Tenant Configuration

### 1. Create a new Auth0 tenant
- Go to [manage.auth0.com](https://manage.auth0.com) → Create Tenant → name it `vaultguard-dev`

### 2. Create a Regular Web Application
- Applications → Create Application → Regular Web Application
- Name: `VaultGuard Web`
- Callback URLs: `http://localhost:3000/api/auth/callback`
- Logout URLs: `http://localhost:3000`
- Save: **Domain**, **Client ID**, **Client Secret**

### 3. Create an API
- Applications → APIs → Create API
- Name: `VaultGuard API`
- Identifier: `https://api.vaultguard.ai`
- Algorithm: RS256

### 4. Enable Token Vault
- Auth0 Dashboard → AI Agents → Token Vault → Enable

### 5. Set up Connected Accounts
- **Slack:** AI Agents → Connected Accounts → Add Connection → Slack
  - Scopes: `admin.users:read`, `admin.apps:read`, `users:read`, `users:read.email`, `team:read`, `channels:read`
- **GitHub:** AI Agents → Connected Accounts → Add Connection → GitHub
  - Scopes: `read:org`, `read:user`, `repo`, `read:audit_log`, `admin:org`

### 6. Enable CIBA
- Applications → VaultGuard Web → Advanced Settings → Grant Types
- Enable: `urn:openid:params:grant-type:ciba`

### 7. Enable MFA + Step-Up Authentication
- Security → Multi-factor Auth → Enable at least one factor (OTP recommended)
- Set MFA policy to **"Never"** (MFA is triggered only by our Post-Login Action, not globally)
- Actions → Flows → Login → Create a new Action with this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const MFA_POLICY = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';
  const namespace = 'https://api.vaultguard.ai';

  // Trigger MFA only when step-up is explicitly requested via acr_values
  if (event.transaction?.acr_values?.includes(MFA_POLICY)) {
    api.multifactor.enable('any', { allowRememberBrowser: false });
  }

  // Copy MFA status to access token so the backend StepUpGuard can read it
  if (event.authentication?.methods) {
    const usedMfa = event.authentication.methods.some(m => m.name === 'mfa');
    if (usedMfa) {
      api.accessToken.setCustomClaim(`${namespace}/amr`, ['mfa']);
      api.accessToken.setCustomClaim(`${namespace}/auth_time`, Math.floor(Date.now() / 1000));
    }
  }
};
```

### 8. Set up FGA
- FGA tab → Create store: `vaultguard`
- Apply authorization model from `scripts/setup-fga-model.sh`

## Supabase Setup

1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Run `scripts/setup-database.sql` in the SQL Editor
3. Note down: **Project URL** and **service_role key**

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. Add Bot Token Scopes (see Connected Accounts section above)
3. Install to your test workspace

## GitHub OAuth App Setup

1. GitHub → Settings → Developer Settings → OAuth Apps → New
2. Callback URL: `https://YOUR_AUTH0_DOMAIN/login/callback`

## Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup-local.sh` | Full local setup (prereqs, deps, build check) |
| `scripts/setup-database.sql` | Idempotent database schema (run in Supabase SQL Editor) |
| `scripts/setup-retention.sql` | Data retention functions — run after setup-database.sql |
| `scripts/seed-database.sql` | Test data for local development |
| `scripts/setup-fga-model.sh` | Deploy Auth0 FGA authorization model |
| `scripts/deploy-web.sh` | Deploy frontend to Vercel (`--prod` for production) |
| `scripts/deploy-api.sh` | Deploy backend to Railway |

## Deployment

All deployments are handled via scripts:

```bash
# Deploy frontend to Vercel (preview)
./scripts/deploy-web.sh

# Deploy frontend to Vercel (production)
./scripts/deploy-web.sh --prod

# Deploy backend to Railway
./scripts/deploy-api.sh
```

### Post-Deployment Checklist

1. Update Auth0 callback URLs with production domains
2. Set `AUTH0_BASE_URL` in Vercel to the production URL
3. Set `NEXT_PUBLIC_API_URL` in Vercel to the Railway backend URL
4. Set `FRONTEND_URL` in Railway to the Vercel production URL
5. Add Redis add-on in Railway: `railway add redis`
