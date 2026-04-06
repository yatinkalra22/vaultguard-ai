# VaultGuard AI — Troubleshooting

Use this guide to diagnose common local setup and deployment issues.

## Quick triage

1. Confirm environment files exist:
   - `apps/web/.env.local`
   - `apps/api/.env`
2. Confirm required keys are populated (see `docs/ENV_VARS_REFERENCE.md`).
3. Confirm dependencies build:

```bash
pnpm lint
pnpm build
```

4. Start local dev:

```bash
pnpm dev
```

## Auth and login issues

### Symptom: login redirects fail or callback errors

Checks:

- `APP_BASE_URL` (frontend) / `AUTH0_BASE_URL` (backend) matches active web origin.
- `AUTH0_ISSUER_BASE_URL` points to your Auth0 tenant domain.
- Auth0 app callback URL includes `/auth/callback` for your environment.

### Symptom: API returns 401 for authenticated user

Checks:

- API `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` match the token issuer/audience.
- Frontend sends API calls through proxy routes.
- JWT validation is not bypassed in non-dev environments.

## Step-up and remediation issues

### Symptom: remediation request denied with step-up errors

Checks:

- MFA is configured in Auth0 tenant.
- Step-up Action is installed in Auth0 Login flow.
- User completed step-up before remediation action.

### Symptom: remediation denied by policy

Checks:

- FGA credentials are configured (`FGA_STORE_ID`, `FGA_CLIENT_ID`, `FGA_CLIENT_SECRET`).
- FGA model was deployed with `./scripts/setup-fga-model.sh`.
- User relationship tuples include required approval capability.

## Integration and scan issues

### Symptom: Slack or GitHub scans fail

Checks:

- Provider connection exists for the org in Integrations page.
- Connected Account scopes include required permissions.
- Token Vault is enabled in tenant.
- API has Auth0 client credentials configured.

### Symptom: Auth0 sidebar does not show AI Agents

Checks:

- Confirm you are in the Auth0 tenant created for this project, not a different tenant.
- Confirm you are signed in with an admin account for that tenant.
- Refresh the dashboard after switching tenants.
- If Token Vault is missing from AI Agents, check the web application: Applications → VaultGuard Web → Advanced Settings → Grant Types.
- If it still is not visible, the tenant may not have Token Vault / Connected Accounts enabled yet.

### Symptom: GitHub connection error about Auth0 Developer Keys

Checks:

- Open the GitHub social connection in Auth0 and confirm **Client ID** and **Client Secret** are populated.
- Do not leave them blank. Blank fields use Auth0's developer keys, which cannot be used for Connected Accounts with Token Vault.
- Make sure those values come from your own GitHub OAuth App in GitHub Developer Settings → OAuth Apps.

### Symptom: Slack error "redirect_uri did not match any configured URIs"

Checks:

- Open your Slack app in `api.slack.com/apps`.
- Go to **OAuth & Permissions** (not Basic Information).
- Add redirect URL exactly: `https://vaultguard-ai-dev.us.auth0.com/login/callback`.
- Save the redirect URL, then retry the Auth0 connection flow.

### Symptom: Slack error "Invalid permissions requested" / `invalid_scope`

This happens when the Auth0 Slack connection type is incompatible with the scopes being requested.

**Root cause A — built-in `slack-oauth-2` connection with `connection_scope`:**
Auth0's built-in "Slack OAuth 2.0" connection uses Sign in with Slack (SIWS) internally.
SIWS adds its own user scopes (`openid`, `profile`, `email`). When the app also passes
`connection_scope=users:read,...` (non-SIWS scopes), Slack rejects the combined request
as a scope conflict. The official Slack docs state:
> *"A scope conflict occurs when attempting to combine Sign in with Slack (SIWS) user scopes
> with non-Sign in with Slack scopes in the same OAuth flow."*

Fix: Do not use Auth0's built-in `slack-oauth-2`. Create a **custom** connection using
`https://slack.com/oauth/v2_user/authorize` instead. See `docs/BACKEND_ENV_SETUP.md` Step 3c.

**Root cause B — `chat:write` in `AUTH0_CONNECTION_SCOPE_SLACK`:**
`chat:write` is a bot-only scope. It cannot be requested in the user-token (`v2_user`) flow.
Slack returns `invalid_scope` when a bot-only scope appears in a user token request.

Fix: Remove `chat:write` from `AUTH0_CONNECTION_SCOPE_SLACK`.
Correct value: `users:read,users:read.email,team:read,channels:read`.

**Root cause C — `AUTH0_CONNECTION_SCOPE_SLACK` missing entirely:**

- Confirm `AUTH0_CONNECTION_SCOPE_SLACK` exists in your real `apps/api/.env`.
- Restart the API after updating env vars.

### Symptom: Auth0 error `not_allowed_token_type` after clicking Allow on Slack

The Slack OAuth flow completed but Auth0 rejected the token it received.

**Root cause:** The custom Slack connection is using the wrong Authorization/Token URLs.
Slack's standard `oauth.v2.access` endpoint returns `token_type: "bot"`. Auth0 Token
Vault only accepts standard OAuth 2.0 bearer tokens and rejects `token_type: "bot"`.

Fix: Update the **custom** Auth0 Slack connection to use the user-centric endpoints:

| Field | Wrong (bot token flow) | Correct (user token flow) |
|---|---|---|
| Authorization URL | `https://slack.com/oauth/v2/authorize` | `https://slack.com/oauth/v2_user/authorize` |
| Token URL | `https://slack.com/api/oauth.v2.access` | `https://slack.com/api/oauth.v2.user.access` |

The `oauth.v2.user.access` endpoint is "compliant with the OAuth 2.0 RFC" (per Slack docs)
and returns `token_type: "bearer"` — which Auth0 Token Vault accepts.
See: https://docs.slack.dev/authentication/installing-with-oauth#user-centric

### Symptom: "/auth/connect" returns "An unexpected error occurred while trying to initiate the connect account flow"

This means the Auth0 My Account API is not properly configured. Checks:

1. **Activate My Account API:** Dashboard → APIs → look for the "Auth0 My Account" API (or an activation banner). It must be activated.
2. **Authorize VaultGuard Web:** My Account API → Machine to Machine Applications → toggle VaultGuard Web to Authorized.
3. **Enable scopes:** Expand VaultGuard Web's permissions and enable `create:me:connected_accounts`, `read:me:connected_accounts`, `delete:me:connected_accounts`.
4. **Enable MRRT:** My Account API → Settings → enable Multi-Resource Refresh Token (MRRT).
5. **Allow Skipping User Consent:** My Account API → Settings → enable this toggle.
6. **Enable Token Exchange grant:** Applications → VaultGuard Web → Advanced Settings → Grant Types → enable Token Exchange.
7. **Enable Offline Access on connections:** Authentication → Social → Slack/GitHub → Connection Permissions → enable Offline Access.

See `docs/BACKEND_ENV_SETUP.md` Step 3b for the full walkthrough.

### Symptom: Auth0 "Try Connection" shows "The connection is not active for authentication"

This is **expected** when the connection purpose is "Connected Accounts for Token Vault". The "Try Connection" button tests the authentication flow, not the Connected Accounts flow. Use the in-app "Connect Slack" / "Connect GitHub" button instead.

### Symptom: scans run but no findings

Checks:

- Validate provider test workspace/org has expected risk patterns.
- Confirm scan data was written to `scans` and `findings` tables.
- Check API logs for provider API rate limits or empty data responses.

## Database and migration issues

### Symptom: missing tables/functions

Run in order:

1. `scripts/setup-database.sql`
2. `scripts/setup-retention.sql`
3. `scripts/setup-alerting.sql` (for upgrades from older schema)

### Symptom: retention cleanup not running as expected

Checks:

- `AuditRetentionService` schedule is active.
- Retention SQL functions were applied.
- Records meet retention criteria before deletion.

## CORS and proxy issues

### Symptom: browser CORS failures

Checks:

- Backend `FRONTEND_URL` exactly matches deployed frontend origin.
- Frontend `NEXT_PUBLIC_API_URL` points to live backend URL.
- `AUTH0_BASE_URL` remains aligned with deployed web origin.

## Dangerous local flags

These must not be enabled outside local troubleshooting/demo:

- `ALLOW_INSECURE_DEV_AUTH`
- `ENABLE_DEMO_ENDPOINTS`

Production startup blocks if either is `true`.

## Escalation

If issue persists, capture:

- requestId
- endpoint and timestamp
- environment (local/staging/prod)
- relevant redacted logs

Then open an issue or incident note with reproduction steps.
