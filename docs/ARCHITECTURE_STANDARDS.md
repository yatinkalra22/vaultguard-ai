# VaultGuard Architecture and Engineering Standards

## Purpose
This document defines architecture, coding, security, and delivery standards for VaultGuard.

The goal is simple:
- Keep velocity high.
- Keep behavior predictable.
- Keep risk low in security-critical workflows.

## 1) Architecture Standards

### 1.1 Module Boundaries
Each backend module must declare:
- Owned domain objects.
- Public service interfaces.
- Events emitted.
- Events consumed.
- Forbidden dependencies.

Rules:
- Controllers only orchestrate transport concerns.
- Domain logic lives in service/application layers.
- External providers are adapters and must not contain policy decisions.
- Cross-module communication should happen via explicit service contract or event.

### 1.2 Dependency Direction
Allowed dependency flow:
- Interfaces and DTOs -> Application services -> Provider adapters

Disallowed:
- Provider adapters calling sibling provider internals.
- Controllers mutating state directly through repository clients.

### 1.3 ADR Requirement
Any non-trivial architecture change requires an ADR in docs/adr.
Examples:
- New integration provider.
- New remediation workflow state.
- New persistence strategy.
- New security model rule.

## 2) API Contract Standards

### 2.1 API Versioning
- Public API paths must remain backward compatible within a major version.
- Breaking changes require a new versioned route or migration period.

### 2.2 Error Envelope
All API errors should conform to one shape:
- code: stable machine-readable code.
- message: safe user-facing message.
- requestId: trace correlation id.
- details: optional structured validation information.

### 2.3 Request Correlation
- Every request must carry requestId.
- requestId must be present in logs and error responses.

## 3) TypeScript and Naming Standards

### 3.1 Type Safety
- strict mode is mandatory.
- no explicit any in authored source.
- avoid unknown-to-string assumptions without conversion helpers.

### 3.2 Naming
Use consistent naming patterns:
- DTOs: CreateXDto, UpdateXDto, XResponseDto.
- Commands: VerbNounCommand.
- Queries: GetNounQuery.
- Events: noun.verb.past, for example finding.remediation.requested.
- Guards and policies: XGuard, XPolicyService.

### 3.3 Linting
- API package must pass both typecheck and ESLint.
- Web package must pass ESLint.
- Shared package must pass typecheck.

## 4) Testing Standards

### 4.1 Required Test Layers
- Unit tests for domain and policy logic.
- Contract tests for controllers and DTO validation.
- Adapter tests for provider clients (Slack, GitHub, Auth0).
- Workflow tests for scan and remediation state transitions.

### 4.2 Critical Path Coverage
Critical flows must have direct test coverage:
- Org isolation and authorization guards.
- Remediation approval and execution.
- Audit write paths.

## 5) Security Standards

### 5.1 Tenant Isolation
- orgId must be passed explicitly for all write operations.
- Missing org context must fail closed.

### 5.2 Secrets and Tokens
- No provider refresh tokens in app database.
- Access tokens must not be logged.
- Authorization headers must remain redacted in logs.

### 5.3 Remediation Safeguards
- Every remediation action must produce decision evidence:
  - requester
  - approver
  - policy result
  - target resource
  - outcome

## 6) Observability Standards

### 6.1 Log Schema
Every structured log for state-changing operations should include:
- requestId
- orgId
- actorId
- action
- status
- durationMs

### 6.2 Operational Metrics
Track and alert on:
- scan success ratio
- remediation success ratio
- remediation time to completion
- policy denial spikes
- API 5xx rate

## 7) CI and Delivery Standards

### 7.1 Required CI Gates
- Lint and typecheck.
- Build.
- Dependency production audit.

### 7.2 Commit Standard
Use conventional commit style:
- feat:
- fix:
- refactor:
- docs:
- chore:

## 8) Product Trust Enhancements

These are recommended architecture-level product differentiators:
- Policy simulation mode for pre-action explainability.
- Blast-radius score for each proposed remediation.
- End-to-end timeline from finding to audit record.
- Dry-run execution mode for remediations.
