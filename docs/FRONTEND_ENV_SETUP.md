# Frontend Environment Setup Guide (`apps/web/.env.local`)

Step-by-step guide to get every key/value for the frontend. The frontend only needs Auth0 credentials and the backend URL.

> **Quick setup:** `cp apps/web/.env.example apps/web/.env.local` then fill in the values below.

---

## Quick Reference

| Variable | Where to Get It |
|----------|----------------|
| `AUTH0_SECRET` | Generate locally with `openssl` |
| `APP_BASE_URL` | Set manually (`http://localhost:3000`) |
| `AUTH0_ISSUER_BASE_URL` | Auth0 Dashboard → Applications → Settings |
| `AUTH0_DOMAIN` | Auth0 Dashboard → Applications → Settings |
| `AUTH0_CLIENT_ID` | Auth0 Dashboard → Applications → Settings |
| `AUTH0_CLIENT_SECRET` | Auth0 Dashboard → Applications → Settings |
| `AUTH0_AUDIENCE` | Auth0 Dashboard → APIs |
| `AUTH0_ORGANIZATION_ID` | Auth0 Dashboard → Organizations → Your Org |
| `NEXT_PUBLIC_API_URL` | Set manually (`http://localhost:4000`) |

---

## Step 1: Generate AUTH0_SECRET (Local — No Dashboard Needed)

This is a random session encryption secret used by the Auth0 Next.js SDK. Generate it locally:

```bash
openssl rand -hex 32
```

Copy the output. Example: `a1b2c3d4e5f6...64-character-hex-string`

```env
AUTH0_SECRET=paste_the_generated_hex_here
```

> **Important:** Generate a unique secret for each environment (local, staging, production). Never reuse across environments.

---

## Step 2: Set Local URLs (No Dashboard Needed)

```env
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_BASE_URL` | `http://localhost:3000` | The URL where your frontend runs. Auth0 SDK uses this for login/logout callbacks. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | The backend API URL. Keep this on a different port from the web app (`3000`) in local dev. The `NEXT_PUBLIC_` prefix makes it available in browser code. |

For production, these would be your deployed URLs (e.g., `https://vaultguard.ai` and `https://api.vaultguard.ai`).

---

## Step 3: Auth0 — Get Your Application Credentials

If you already set up Auth0 for the backend, **use the same application**. The frontend and backend share the same Auth0 app.

### If Starting Fresh: Create an Auth0 Account + App

1. Go to **https://auth0.com/signup** and create an account (free tier works)
2. Create a tenant (e.g., `vaultguard-dev`)

### Get Your Credentials

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Applications** → **Applications**
3. Click on **VaultGuard Web** (or create one — see backend guide Step 2b)
4. Go to the **Settings** tab

**Copy these 4 values from the top of the Settings page:**

| Field on Screen | Env Variable | Example |
|----------------|-------------|---------|
| **Domain** | `AUTH0_ISSUER_BASE_URL` | `https://vaultguard-dev.us.auth0.com` |
| **Domain** | `AUTH0_DOMAIN` | `vaultguard-dev.us.auth0.com` |
| **Client ID** | `AUTH0_CLIENT_ID` | `aBcDeFgHiJkLmNoPqRsTuVwXyZ123456` |
| **Client Secret** | `AUTH0_CLIENT_SECRET` | `a1B2c3D4e5F6g7H8i9J0kL1mN2oP3qR4...` |

> **Note:** `AUTH0_ISSUER_BASE_URL` needs the `https://` prefix (e.g., `https://vaultguard-dev.us.auth0.com`). `AUTH0_DOMAIN` does NOT have the prefix (just `vaultguard-dev.us.auth0.com`).

### Configure Callback URLs (if not already done)

Still on the Settings page, scroll down to **Application URIs**:

| Field | Value (Local) | Value (Production) |
|-------|--------------|-------------------|
| **Allowed Callback URLs** | `http://localhost:3000/auth/callback` | `https://your-domain.com/auth/callback` |
| **Allowed Logout URLs** | `http://localhost:3000` | `https://your-domain.com` |
| **Allowed Web Origins** | `http://localhost:3000` | `https://your-domain.com` |

Click **Save Changes**.

---

## Step 4: Auth0 — API Audience

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Applications** → **APIs**
3. Find **VaultGuard API** (or create one — see backend guide Step 2c)

**Copy this value:**

| Field on Screen | Env Variable | Value |
|----------------|-------------|-------|
| **Identifier** | `AUTH0_AUDIENCE` | `https://api.vaultguard.ai` |

```env
AUTH0_AUDIENCE=https://api.vaultguard.ai
```

---

## Step 5: Auth0 — Organization Setup

VaultGuard expects the signed-in user to belong to an Auth0 Organization so the JWT includes `org_id`.

1. Go to **https://manage.auth0.com/dashboard**
2. Left sidebar → **Organizations** → **Organizations**
3. Create an organization for VaultGuard if you have not already
4. Open the organization and copy its **Organization ID**
5. Add that value to `AUTH0_ORGANIZATION_ID` in `apps/web/.env.local`
6. Add your user as a member of that organization

If your Auth0 org page does not show an application enablement tab (newer UI), configure access from the application side instead:

- **Applications → VaultGuard Web**
- Set **Types of Users** to **Business Users** or **Both**
- Save changes

If you skip this step, the app can authenticate successfully but the backend will reject connect/remediation actions with `no_organization`.

> **Important:** After adding the organization or adding a user to it, fully sign out of VaultGuard and Auth0, then sign in again. Existing sessions will not pick up the new `org_id` claim.

> **Note:** If Auth0 shows "Connected Accounts only connections aren't supported in Organizations yet", that is expected for Slack/GitHub here. Do not try to enable those from the Organization Connections page. Keep them configured on the Social/Connected Accounts connection itself and ensure the user is a member of the organization.

---

## Complete Frontend `.env.local` File

```env
# ── Auth0 ──
AUTH0_SECRET=your_generated_hex_secret_here
APP_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=https://api.vaultguard.ai

# ── Backend API ──
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## All Dashboard URLs at a Glance

| Service | Dashboard URL | What You Get There |
|---------|--------------|-------------------|
| **Auth0** | https://manage.auth0.com/dashboard | Domain, Client ID, Client Secret |
| **Auth0 APIs** | https://manage.auth0.com/dashboard → APIs | API Audience (Identifier) |

That's it — the frontend only needs Auth0 + the backend URL.

---

## Shared vs. Separate: Frontend & Backend Auth0 Keys

| Variable | Same in Both? | Notes |
|----------|:------------:|-------|
| `AUTH0_DOMAIN` | Yes | Same tenant for both apps |
| `AUTH0_CLIENT_ID` | Yes | Same Auth0 application |
| `AUTH0_CLIENT_SECRET` | Yes | Same Auth0 application |
| `AUTH0_AUDIENCE` | Yes | Same API identifier |
| `APP_BASE_URL` | Yes | Same frontend origin |
| `AUTH0_SECRET` | Frontend only | Session encryption, not needed in backend |
| `AUTH0_ISSUER_BASE_URL` | Frontend only | Auth0 SDK needs `https://` prefix version |
| `NEXT_PUBLIC_API_URL` | Frontend only | Points to the backend |

> **Key insight:** The Auth0 credentials are the same across both apps. You set them up once in Auth0, then copy the same values into both `.env` files.

---

## Production Deployment Values

When deploying, update these values:

| Variable | Local | Production |
|----------|-------|-----------|
| `AUTH0_SECRET` | Generated hex | **New** generated hex (different from local) |
| `APP_BASE_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `AUTH0_ISSUER_BASE_URL` | `https://tenant.us.auth0.com` | Same (or production tenant) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | `https://api.your-domain.com` |

Remember to update **Allowed Callback URLs** and **Allowed Logout URLs** in Auth0 dashboard to include your production domain.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login redirects to error page | Check `AUTH0_ISSUER_BASE_URL` has `https://` prefix |
| "Callback URL mismatch" error | Add your URL to Allowed Callback URLs in Auth0 Dashboard |
| API calls return 401 | Verify `AUTH0_AUDIENCE` matches the API Identifier in Auth0 |
| `AUTH0_SECRET` error on start | Must be at least 32 characters. Regenerate with `openssl rand -hex 32` |
| "NEXT_PUBLIC_API_URL is undefined" | Variables prefixed with `NEXT_PUBLIC_` require a server restart after changes |
| CORS error on API calls | Ensure backend `FRONTEND_URL` matches `APP_BASE_URL` exactly (no trailing slash) |
