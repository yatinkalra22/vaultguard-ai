# VaultGuard Documentation Index

This index is the source of truth for project documentation.

## Core docs

| Document | Purpose | Update when |
|---|---|---|
| [setup.md](./setup.md) | Local setup and third-party provider configuration | Env vars, auth providers, local bootstrap steps change |
| [deployment.md](./deployment.md) | Deployment preflight, rollout, rollback, post-deploy verification | Runtime env vars, hosting targets, release procedure change |
| [ENV_VARS_REFERENCE.md](./ENV_VARS_REFERENCE.md) | Canonical environment variable meanings and requiredness by runtime | Environment model or required keys change |
| [architecture.md](./architecture.md) | System architecture, trust boundaries, module map, data flow | New module, provider, data model, or security boundary is added |
| [ARCHITECTURE_STANDARDS.md](./ARCHITECTURE_STANDARDS.md) | Engineering, security, testing, and delivery standards | Team standards or governance rules change |
| [API_REFERENCE.md](./API_REFERENCE.md) | Backend endpoint map, error envelope, and auth expectations | Routes, contracts, or auth guards change |
| [TESTING.md](./TESTING.md) | Test commands, current coverage posture, and validation workflow | Test scripts, CI gates, or test strategy changes |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common failures and diagnosis/remediation paths | New failure modes or major config changes are introduced |
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | Release sequence, incident triage, and rollback procedures | Deployment tooling, SLOs, or incident response process changes |

## Governance docs

| Document | Purpose | Notes |
|---|---|---|
| [adr/README.md](./adr/README.md) | ADR process and lifecycle | Add ADRs for non-trivial architecture decisions |
| [adr/0000-template.md](./adr/0000-template.md) | ADR template | Copy and increment number for each new ADR |

## Supporting docs

| Document | Purpose | Audience |
|---|---|---|
| [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Security findings and hardening changelog | Engineering and security reviewers |
| [PLAN.md](./PLAN.md) | Historical implementation phases and milestones | Engineering context/history |
| [blog-post.md](./blog-post.md) | Hackathon blog draft | Marketing/submission use |

## Documentation quality checklist

Use this checklist before merging docs updates:

- Ensure each command shown is executable as written.
- Ensure each referenced script/file exists.
- Ensure new docs are linked from [README.md](../README.md) and this index.
- Keep `.env.example` and [ENV_VARS_REFERENCE.md](./ENV_VARS_REFERENCE.md) aligned.
- Keep setup in [setup.md](./setup.md), deployment in [deployment.md](./deployment.md), and avoid duplicating step-by-step flows elsewhere.
- Update [README.md](../README.md) links whenever new docs are added or renamed.
- Prefer linking to canonical docs instead of copying detailed procedures.
