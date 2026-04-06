# VaultGuard AI — Setup Guide

This document is the canonical setup guide for local development and provider onboarding.

For deployment and release operations, use [deployment.md](./deployment.md).
For a complete environment variable matrix, use [ENV_VARS_REFERENCE.md](./ENV_VARS_REFERENCE.md).

## Environment Variable Setup Guides

For detailed, step-by-step instructions on where to get every key/secret:

- **[Backend ENV Setup Guide](./BACKEND_ENV_SETUP.md)** — Auth0, FGA, Supabase, Anthropic, all with exact URLs and screenshots instructions
- **[Frontend ENV Setup Guide](./FRONTEND_ENV_SETUP.md)** — Auth0 credentials and backend URL setup

These guides walk you through every dashboard, every click, and every value to copy.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 8+ (`npm install -g pnpm`)
- Git
- Auth0 account (free tier: [auth0.com](https://auth0.com))
- Supabase account (free tier: [supabase.com](https://supabase.com))
- Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) — primary AI provider
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com)) — fallback AI provider (optional if you have Gemini)
- Slack workspace with admin rights (for testing)
- GitHub account with org admin rights (for testing)

## Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/vaultguard-ai.git
cd vaultguard-ai

# 2. Run the setup script (checks prereqs, installs deps, builds)
./scripts/setup-local.sh

# 3. Set up environment variables (each app has its own .env.example)
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# Edit each file with your credentials
# Step-by-step guides: docs/FRONTEND_ENV_SETUP.md & docs/BACKEND_ENV_SETUP.md

# 4. Set up the database
# Run scripts/setup-database.sql in your Supabase SQL editor
# Then run scripts/setup-retention.sql (required for retention jobs)
# If upgrading an existing environment with pre-alert schema, also run scripts/setup-alerting.sql
# Optionally run scripts/seed-database.sql for test data

# 5. Deploy FGA authorization model
./scripts/setup-fga-model.sh

# 6. Start development
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

## Setup Decision Path

- Fresh install:
  - Run `scripts/setup-database.sql`
  - Run `scripts/setup-retention.sql`
  - Optionally run `scripts/seed-database.sql`
- Existing install upgrade:
  - Run `scripts/setup-database.sql`
  - Run `scripts/setup-alerting.sql`
  - Run `scripts/setup-retention.sql`

## Security-Sensitive Local Flags

- `ALLOW_INSECURE_DEV_AUTH=true` and `ENABLE_DEMO_ENDPOINTS=true` are local troubleshooting/demo toggles only.
- Never enable either flag in shared, staging, or production environments.
- Production startup is intentionally blocked if either flag is `true`.

## Terminology

- Connected Accounts: the one-time OAuth consent flow (Slack/GitHub).
- Token Vault: where provider refresh tokens are stored and exchanged for access tokens.
- CIBA: human approval step for remediation before any high-impact action executes.
- Remediation: a requested fix action that requires both authorization and approval.

## Auth0 Tenant Configuration

### 1. Create a new Auth0 tenant
- Go to [manage.auth0.com](https://manage.auth0.com) → Create Tenant → name it `vaultguard-dev`

### 2. Create a Regular Web Application
- Applications → Create Application → Regular Web Application
- Name: `VaultGuard Web`
- Callback URLs: `http://localhost:3000/auth/callback`
- Logout URLs: `http://localhost:3000`
- Save: **Domain**, **Client ID**, **Client Secret**

### 3. Create an API
- Applications → APIs → Create API
- Name: `VaultGuard API`
- Identifier: `https://api.vaultguard.ai`
- Algorithm: RS256

### 4. Enable Token Vault & Token Exchange
- Auth0 Dashboard → Applications → VaultGuard Web → Advanced Settings → Grant Types
- Enable **Token Vault** and **Token Exchange**
- If available in your tenant, keep CIBA enabled in the same Grant Types section

### 5. Activate the My Account API
VaultGuard uses the SDK's `/auth/connect` endpoint to connect user accounts, which requires the My Account API.

1. Dashboard → Applications → **APIs**
2. Find and activate **Auth0 My Account** API
3. Authorize **VaultGuard Web** with scopes: `create:me:connected_accounts`, `read:me:connected_accounts`, `delete:me:connected_accounts`
4. Enable **Allow Skipping User Consent** and **MRRT** (Multi-Resource Refresh Token) in the API settings

See `docs/BACKEND_ENV_SETUP.md` Step 3b for the detailed walkthrough.

### 6. Set up Social Connections

#### Slack — Custom Social Connection (required for Token Vault)

Auth0 has two Slack connection types. Only the **custom** one works for Token Vault:

| Connection type | Token returned | Works with Token Vault? |
|---|---|---|
| Built-in "Sign in with Slack" (`sign-in-with-slack`) | SIWS identity token | ❌ SIWS scopes conflict with Web API scopes |
| Built-in "Slack OAuth 2.0" (`slack-oauth-2`) | Bot token (`xoxb-`, `token_type: "bot"`) | ❌ Auth0 rejects `token_type: "bot"` |
| **Custom using `v2_user` endpoint** | User bearer token (`xoxp-`, `token_type: "bearer"`) | ✅ Standard OAuth 2.0 — Auth0 accepts it |

**Steps:**

1. Authentication → Social → **Create Custom** (scroll to the bottom of the provider list)
2. Fill in:
   - **Name:** `slack-custom`
   - **Authorization URL:** `https://slack.com/oauth/v2_user/authorize`
   - **Token URL:** `https://slack.com/api/oauth.v2.user.access`
   - **Scope:** `users:read users:read.email team:read channels:read`
   - **Client ID / Client Secret:** from your Slack app (`api.slack.com/apps` → Basic Information → App Credentials)
3. Paste this **Fetch User Profile Script:**

   ```javascript
   function(accessToken, ctx, cb) {
     request.get('https://slack.com/api/auth.test', {
       headers: { 'Authorization': 'Bearer ' + accessToken },
       json: true
     }, function(err, resp, body) {
       if (err) return cb(err);
       if (!body.ok) return cb(new Error(body.error));
       cb(null, {
         user_id: body.user_id,
         name: body.user,
         team_id: body.team_id
       });
     });
   }
   ```

4. Purpose: **Connected Accounts for Token Vault**
5. Under **Applications using this connection**, enable **VaultGuard Web** only
6. Under **Connection Permissions**, enable **Offline Access**

> **Why `v2_user` instead of `v2`?**
> Slack's standard `/oauth/v2/authorize` + `oauth.v2.access` returns a bot token with
> `token_type: "bot"`. Auth0 Token Vault rejects non-bearer token types. The `v2_user`
> endpoint (`/oauth/v2_user/authorize` + `oauth.v2.user.access`) is compliant with the
> OAuth 2.0 RFC and returns `token_type: "bearer"` — which Auth0 Token Vault accepts.
> See: https://docs.slack.dev/authentication/installing-with-oauth#user-centric

> **Why not `chat:write`?** `chat:write` is a bot-only scope. The `v2_user` flow issues
> user tokens, and bot-only scopes in a user token request cause Slack to return
> `invalid_scope`. Omit it here — alert delivery via `chat.postMessage` requires a
> separate bot token flow if needed.

#### GitHub

- Authentication → Social → Add Connection → **GitHub**
  - Purpose: **Connected Accounts for Token Vault**
  - Scopes: `read:org`, `read:user`, `repo`, `read:audit_log`, `admin:org`
  - Under **Applications**, enable **VaultGuard Web** only
  - Under **Connection Permissions**, enable **Offline Access**

Set backend env vars to match the connection names you used:

```env
AUTH0_CONNECTION_SLACK=slack-custom
AUTH0_CONNECTION_GITHUB=github
```

### 7. Enable CIBA
- Applications → VaultGuard Web → Advanced Settings → Grant Types
- Enable: `urn:openid:params:grant-type:ciba`
- CIBA (Client-Initiated Backchannel Authentication) is used as explicit human approval for remediation actions.

### 8. Enable MFA + Step-Up Authentication
- Security → Multi-factor Auth → Enable at least one factor (OTP recommended)
- Set MFA policy to **"Never"** (MFA is triggered only by our Post-Login Action, not globally)
- Actions → Triggers → Login → Create a new Action with this code:
- If your tenant still shows Flows, use the equivalent Actions → Login path

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
3. In Supabase: **Settings → Data API** copy **Project URL**
4. In Supabase: **Settings → API Keys** copy either legacy **service_role** or a **Secret key** for backend use

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. Open the app → **Basic Information** → **App Credentials**.
3. Copy the **Client ID** and **Client Secret** for the Auth0 social connection in Step 5.
4. Open **OAuth & Permissions** and add this redirect URL exactly:
  - `https://vaultguard-ai-dev.us.auth0.com/login/callback`
5. In the same page, add **Bot Token Scopes** for the backend scanner.
6. Install to your test workspace.

## GitHub OAuth App Setup

1. GitHub → Settings → Developer Settings → OAuth Apps → New
2. Copy the **Client ID** and **Client Secret** from that app into the Auth0 GitHub social connection.
3. Homepage URL: `http://localhost:3000` while developing, or your deployed web app URL in production.
4. Authorization callback URL: `https://vaultguard-ai-dev.us.auth0.com/login/callback`

> If Auth0 shows an error about using Auth0's Developer Keys, this means the GitHub social connection is still using Auth0 defaults. Replace them with your own GitHub OAuth app credentials.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup-local.sh` | Full local setup (prereqs, deps, build check) |
| `scripts/setup-database.sql` | Idempotent database schema (run in Supabase SQL Editor) |
| `scripts/setup-alerting.sql` | Alerting migration for older databases (upgrade path) |
| `scripts/setup-retention.sql` | Required retention functions/procedures (run after setup-database.sql) |
| `scripts/seed-database.sql` | Test data for local development |
| `scripts/setup-fga-model.sh` | Deploy Auth0 FGA authorization model |
| `scripts/deploy-web.sh` | Deploy frontend to Vercel (`--prod` for production) |
| `scripts/deploy-api.sh` | Deploy backend to Railway |

## Deployment

Deployment and post-deploy verification are maintained in [deployment.md](./deployment.md).
