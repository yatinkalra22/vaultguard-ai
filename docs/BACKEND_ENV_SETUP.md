# Backend Environment Setup Guide (`apps/api/.env`)

Step-by-step guide to get every key/value for the backend. Follow in order — some steps depend on earlier ones.

> **Quick setup:** `cp apps/api/.env.example apps/api/.env` then fill in the values below.

---

## Quick Reference

| Variable | Where to Get It |
|----------|----------------|
| `PORT` | Set manually (default: `4000`) |
| `NODE_ENV` | Set manually (`development` or `production`) |
| `AUTH0_DOMAIN` | Auth0 Dashboard → Applications → Settings |
| `AUTH0_AUDIENCE` | Auth0 Dashboard → APIs |
| `AUTH0_CLIENT_ID` | Auth0 Dashboard → Applications → Settings |
| `AUTH0_CLIENT_SECRET` | Auth0 Dashboard → Applications → Settings |
| `FGA_STORE_ID` | Auth0 FGA Dashboard |
| `FGA_CLIENT_ID` | Auth0 FGA Dashboard → Settings |
| `FGA_CLIENT_SECRET` | Auth0 FGA Dashboard → Settings |
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys |
| `FRONTEND_URL` | Set manually (`http://localhost:3000`) |
| `AUTH0_BASE_URL` | Set manually (`http://localhost:3000`) |
| `DEFAULT_GITHUB_ORG` | Your GitHub org name (optional) |

---

## Step 1: Server Configuration (No External Service Needed)

Set these directly — no dashboard required.

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
AUTH0_BASE_URL=http://localhost:3000
```

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `4000` | The port NestJS listens on. Change if 4000 is taken. |
| `NODE_ENV` | `development` | Use `production` for deployed environments. Production enforces strict startup checks. |
| `FRONTEND_URL` | `http://localhost:3000` | Must match your frontend URL exactly. Used for CORS whitelist. |
| `AUTH0_BASE_URL` | `http://localhost:3000` | Used for auth redirect/callback flows. Usually same as FRONTEND_URL. |

---

## Step 2: Auth0 — Domain, Client ID, Client Secret, Audience

You need **one Auth0 tenant** that provides 4 values for the backend.

### 2a. Create an Auth0 Account

1. Go to **https://auth0.com/signup**
2. Sign up (free tier is fine)
3. Create a tenant — name it something like `vaultguard-dev`

### 2b. Create a Regular Web Application

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Applications** → **Applications**
3. Click **+ Create Application**
4. Name: `VaultGuard Web`
5. Type: **Regular Web Applications**
6. Click **Create**
7. Go to the **Settings** tab

**Copy these 3 values:**

| Value on Screen | Env Variable | Example |
|----------------|-------------|---------|
| **Domain** | `AUTH0_DOMAIN` | `vaultguard-dev.us.auth0.com` |
| **Client ID** | `AUTH0_CLIENT_ID` | `aBcDeFgHiJkLmNoPqRsTuVwXyZ123456` |
| **Client Secret** | `AUTH0_CLIENT_SECRET` | `a1B2c3D4e5F6g7H8i9J0...` |

Still on the Settings page, scroll down and configure:

- **Allowed Callback URLs:** `http://localhost:3000/api/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`
- Click **Save Changes**

### 2c. Create an API (for the Audience)

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Applications** → **APIs**
3. Click **+ Create API**
4. Name: `VaultGuard API`
5. Identifier: `https://api.vaultguard.ai`
6. Signing Algorithm: **RS256**
7. Click **Create**

**Copy this value:**

| Value | Env Variable | Value |
|-------|-------------|-------|
| **Identifier** | `AUTH0_AUDIENCE` | `https://api.vaultguard.ai` |

```env
AUTH0_DOMAIN=vaultguard-dev.us.auth0.com
AUTH0_AUDIENCE=https://api.vaultguard.ai
AUTH0_CLIENT_ID=your_client_id_here
AUTH0_CLIENT_SECRET=your_client_secret_here
```

---

## Step 3: Auth0 — Enable Token Vault & Connected Accounts

Token Vault stores Slack/GitHub OAuth tokens securely in Auth0's infrastructure.

### 3a. Enable Token Vault

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **AI Agents** → **Token Vault**
3. Click **Enable**

### 3b. Add Slack Connected Account

1. Left sidebar → **AI Agents** → **Connected Accounts**
2. Click **Add Connection**
3. Select **Slack**
4. Add these scopes:
   - `admin.users:read`
   - `admin.apps:read`
   - `users:read`
   - `users:read.email`
   - `team:read`
   - `channels:read`
5. Save

> **Where to create Slack app credentials:** https://api.slack.com/apps → Create New App → From Scratch. Copy the Client ID and Client Secret into the Connected Account config in Auth0.

### 3c. Add GitHub Connected Account

1. Still in **Connected Accounts** → **Add Connection**
2. Select **GitHub**
3. Add these scopes:
   - `read:org`
   - `read:user`
   - `repo`
   - `read:audit_log`
   - `admin:org`
4. Save

> **Where to create GitHub OAuth app credentials:** https://github.com/settings/developers → OAuth Apps → New OAuth App. Set the callback URL to `https://YOUR_AUTH0_DOMAIN/login/callback`. Copy Client ID and Client Secret into the Connected Account config in Auth0.

No extra env vars needed — Token Vault uses the same `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` from Step 2.

---

## Step 4: Auth0 — Enable CIBA (Human-in-the-Loop Approval)

CIBA lets the AI agent request human approval via email before executing remediations.

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Applications** → **Applications**
3. Click on **VaultGuard Web** (the app from Step 2)
4. Go to **Settings** tab → scroll to **Advanced Settings** (bottom)
5. Click **Grant Types** tab
6. Check: **`urn:openid:params:grant-type:ciba`**
7. Click **Save Changes**

No extra env vars needed — CIBA uses the same `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.

---

## Step 5: Auth0 — Enable MFA & Step-Up Authentication

Step-up auth requires MFA before any remediation action.

### 5a. Enable MFA

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Security** → **Multi-factor Auth**
3. Enable at least one factor (recommended: **One-time Password**)
4. Set MFA Policy to **"Never"** (MFA is triggered only by our custom Action, not globally)

### 5b. Create the Step-Up Login Action

1. Left sidebar → **Actions** → **Flows**
2. Click **Login**
3. Click **+** (Add Action) → **Build from Scratch**
4. Name: `VaultGuard Step-Up MFA`
5. Paste this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const MFA_POLICY = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';
  const namespace = 'https://api.vaultguard.ai';

  if (event.transaction?.acr_values?.includes(MFA_POLICY)) {
    api.multifactor.enable('any', { allowRememberBrowser: false });
  }

  if (event.authentication?.methods) {
    const usedMfa = event.authentication.methods.some(m => m.name === 'mfa');
    if (usedMfa) {
      api.accessToken.setCustomClaim(`${namespace}/amr`, ['mfa']);
      api.accessToken.setCustomClaim(`${namespace}/auth_time`, Math.floor(Date.now() / 1000));
    }
  }
};
```

6. Click **Deploy**
7. Drag the action into the Login flow and click **Apply**

---

## Step 6: Auth0 FGA (Fine-Grained Authorization)

FGA controls who can approve which remediation actions.

### 6a. Create an FGA Store

1. Go to **https://dashboard.fga.dev**
   - (Or: Auth0 Dashboard → Left sidebar → **Fine Grained Authorization**)
2. Click **Create Store**
3. Name: `vaultguard`
4. Once created, you'll see the store dashboard

**Copy this value:**

| Value on Screen | Env Variable | Example |
|----------------|-------------|---------|
| **Store ID** | `FGA_STORE_ID` | `01HXYZ...` |

### 6b. Create FGA API Credentials

1. In the FGA Dashboard → **Settings** → **API Credentials**
2. Click **Create Credentials**

**Copy these values:**

| Value on Screen | Env Variable | Example |
|----------------|-------------|---------|
| **Client ID** | `FGA_CLIENT_ID` | `aBcDeFg...` |
| **Client Secret** | `FGA_CLIENT_SECRET` | `xYz123...` |

### 6c. Deploy the Authorization Model

Run this from the project root:

```bash
./scripts/setup-fga-model.sh
```

```env
FGA_STORE_ID=your_fga_store_id
FGA_CLIENT_ID=your_fga_client_id
FGA_CLIENT_SECRET=your_fga_client_secret
```

---

## Step 7: Supabase (Database)

### 7a. Create a Supabase Project

1. Go to **https://supabase.com/dashboard** (sign up at https://supabase.com if needed)
2. Click **New Project**
3. Name: `vaultguard-ai`
4. Set a database password (save it somewhere safe)
5. Region: choose closest to you
6. Click **Create new project**
7. Wait for project to initialize (~2 minutes)

### 7b. Get Your Keys

1. Left sidebar → **Project Settings** (gear icon at bottom)
2. Click **API** under Configuration

**Copy these values:**

| Value on Screen | Env Variable | Example |
|----------------|-------------|---------|
| **Project URL** | `SUPABASE_URL` | `https://abcdefghijkl.supabase.co` |
| **service_role key** (under "Project API keys") | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJI...` |

> **WARNING:** The `service_role` key bypasses Row Level Security. Never expose it in frontend code or public repos.

### 7c. Set Up the Database Schema

1. In Supabase Dashboard → Left sidebar → **SQL Editor**
2. Click **New Query**
3. Open `scripts/setup-database.sql` from the project, copy-paste the entire contents
4. Click **Run**
5. Repeat with `scripts/setup-retention.sql`
6. (Optional) Repeat with `scripts/seed-database.sql` for test data

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Step 8: Anthropic (Claude AI)

### 8a. Get an API Key

1. Go to **https://console.anthropic.com** (sign up if needed)
2. Left sidebar → **API Keys**
3. Click **Create Key**
4. Name: `vaultguard-ai`
5. Click **Create Key**
6. **Copy the key immediately** — it won't be shown again

**Copy this value:**

| Value on Screen | Env Variable | Example |
|----------------|-------------|---------|
| **API Key** | `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |

> **Pricing:** Claude Sonnet 4.5 costs ~$3/1M input tokens, $15/1M output tokens. A single scan analysis costs fractions of a cent.
> **Free credits:** New accounts typically get $5 in free credits.

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

---

## Step 9: GitHub Org (Optional)

If you want scans to default to a specific GitHub organization:

```env
DEFAULT_GITHUB_ORG=your-org-name
```

This is the GitHub org name from the URL: `https://github.com/your-org-name`

---

## Complete Backend `.env` File

```env
# ── Server ──
PORT=4000
NODE_ENV=development

# ── Auth0 ──
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.vaultguard.ai
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# ── Auth0 FGA ──
FGA_STORE_ID=your_fga_store_id
FGA_CLIENT_ID=your_fga_client_id
FGA_CLIENT_SECRET=your_fga_client_secret

# ── Supabase ──
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ── Anthropic (Claude AI) ──
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# ── URLs ──
FRONTEND_URL=http://localhost:3000
AUTH0_BASE_URL=http://localhost:3000

# ── Optional ──
DEFAULT_GITHUB_ORG=your-github-org
```

---

## All Dashboard URLs at a Glance

| Service | Dashboard URL | What You Get There |
|---------|--------------|-------------------|
| **Auth0** | https://manage.auth0.com/dashboard | Domain, Client ID, Client Secret, Token Vault, CIBA, MFA |
| **Auth0 FGA** | https://dashboard.fga.dev | FGA Store ID, FGA Client ID, FGA Client Secret |
| **Supabase** | https://supabase.com/dashboard | Project URL, Service Role Key, SQL Editor |
| **Anthropic** | https://console.anthropic.com | API Key |
| **Slack Apps** | https://api.slack.com/apps | Slack app credentials (for Auth0 Connected Accounts) |
| **GitHub OAuth** | https://github.com/settings/developers | GitHub OAuth app (for Auth0 Connected Accounts) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `AUTH0_DOMAIN` not working | Make sure it's just the domain (e.g., `tenant.us.auth0.com`), not `https://...` |
| CIBA grant type error | Ensure CIBA grant type is enabled in App → Advanced Settings → Grant Types |
| FGA permission denied | Check FGA credentials are from the same store. Re-run `setup-fga-model.sh` |
| Supabase connection refused | Check `SUPABASE_URL` has `https://` prefix. Verify project is not paused. |
| Anthropic 401 error | API key may have expired or been revoked. Generate a new one. |
| CORS errors | `FRONTEND_URL` must exactly match the origin (no trailing slash) |
