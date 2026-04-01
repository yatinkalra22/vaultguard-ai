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

- `AUTH0_BASE_URL` matches active web origin.
- `AUTH0_ISSUER_BASE_URL` points to your Auth0 tenant domain.
- Auth0 app callback URL includes `/api/auth/callback` for your environment.

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
