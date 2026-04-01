# VaultGuard AI — API Reference

Base path: `/api`

Authentication: Most endpoints require a valid Auth0 JWT. Security-sensitive remediation endpoints additionally require step-up and FGA checks.

## Error envelope

Errors should follow this shape:

```json
{
  "code": "validation_failed",
  "message": "Validation failed",
  "requestId": "f8b4...",
  "details": {}
}
```

Known error codes are defined in `apps/api/src/common/error-codes.ts`:

- `unauthorized`
- `forbidden`
- `validation_failed`
- `not_found`
- `rate_limited`
- `step_up_required`
- `step_up_expired`
- `internal_error`
- `backend_unavailable`

## Endpoint groups

### Health

- `GET /api/health`

### Auth

- `GET /api/auth/me`

### Scans

- `POST /api/scans/trigger`
- `GET /api/scans`
- `GET /api/scans/:id`

### Findings

- `GET /api/findings`
- `GET /api/findings/:id`
- `PATCH /api/findings/:id/ignore`
- `GET /api/findings/analytics/dashboard`
- `GET /api/findings/analytics/severity`
- `GET /api/findings/analytics/category`
- `GET /api/findings/analytics/trends`
- `GET /api/findings/analytics/top-risks`

### Remediations

- `POST /api/remediations`
- `POST /api/remediations/batch-approve`
- `GET /api/remediations`
- `GET /api/remediations/:id`

### Integrations

- `GET /api/integrations`
- `POST /api/integrations/:provider/connect`
- `DELETE /api/integrations/:id`

### Dashboard

- `GET /api/dashboard/summary`
- `GET /api/dashboard/timeline`
- `SSE /api/dashboard/events`
- `POST /api/dashboard/demo-seed` (demo-only; gated)
- `POST /api/dashboard/demo-reset` (demo-only; gated)

### Alerts

- `GET /api/alerts/settings`
- `PATCH /api/alerts/settings`
- `POST /api/alerts/evaluate`
- `GET /api/alerts/history`
- `PATCH /api/alerts/history/:id/acknowledge`

### Audit logs

- `GET /api/audit-logs`

### Metrics

- `GET /api/metrics/dashboard`
- `GET /api/metrics/trend`

### Telemetry

- `POST /api/telemetry`

## Security-critical behavior

- `POST /api/remediations` and `POST /api/remediations/batch-approve`:
  - JWT required
  - Step-up required
  - FGA policy check required
  - Rate limited more strictly than global defaults
- In production:
  - `FRONTEND_URL` and `AUTH0_BASE_URL` are required
  - startup fails if `ALLOW_INSECURE_DEV_AUTH=true`
  - startup fails if `ENABLE_DEMO_ENDPOINTS=true`

## Notes

- Dashboard SSE is unidirectional server push for live scan events.
- Demo endpoints are controlled by `ENABLE_DEMO_ENDPOINTS` and should remain disabled in shared/prod environments.
- Use `x-idempotency-key` on batch remediation requests to avoid duplicate queueing on retries.
