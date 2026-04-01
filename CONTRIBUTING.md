# Contributing to VaultGuard AI

This guide defines the contribution workflow, quality gates, and review expectations.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Repository setup completed via `./scripts/setup-local.sh`

## Branching and commits

- Branch naming:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `docs/<short-description>`
  - `chore/<short-description>`
- Commit style (required):
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `chore: ...`

## Local validation before PR

Run from repository root:

```bash
pnpm lint
pnpm build
pnpm --filter @vaultguard/web test:unit
```

If your change affects API behavior, also verify local health:

```bash
pnpm dev
# then check http://localhost:4000/api/health
```

## Pull request checklist

- Explain what changed and why.
- Link related issue or ADR when applicable.
- Include screenshots or request/response examples for UI/API changes.
- Confirm no production-insecure flags were enabled in shared environments.
- Update documentation when behavior, configuration, or workflows changed.

## CI gates

PRs to `main` are expected to pass:

- API lint + typecheck
- Web lint
- Monorepo build
- Production dependency audit

See CI workflow: `.github/workflows/ci.yml`.

## Architecture and docs expectations

- Follow module boundaries and standards in `docs/ARCHITECTURE_STANDARDS.md`.
- For non-trivial design changes, add an ADR in `docs/adr/`.
- Keep canonical docs updated:
  - Setup: `docs/setup.md`
  - Deployment: `docs/deployment.md`
  - API reference: `docs/API_REFERENCE.md`
  - Troubleshooting: `docs/TROUBLESHOOTING.md`

## Security rules (non-negotiable)

- Never commit secrets.
- Never log provider access tokens or auth headers.
- Keep `ALLOW_INSECURE_DEV_AUTH=false` and `ENABLE_DEMO_ENDPOINTS=false` outside local demo/dev contexts.
- Preserve tenant isolation (`orgId`) on all state-changing flows.

## Review focus areas

Reviewers prioritize:

- Security and authorization correctness
- Tenant isolation boundaries
- API contract stability and error-envelope consistency
- Regression risk in scanning/remediation workflows
- Documentation correctness and link integrity
