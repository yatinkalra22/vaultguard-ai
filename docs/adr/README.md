# Architecture Decision Records (ADR)

This folder stores Architecture Decision Records for VaultGuard.

## When to add an ADR
Create an ADR for decisions that change architecture, constraints, or long-term direction.

Examples:
- Introducing or replacing a provider integration model.
- Changing remediation orchestration.
- Introducing new tenancy or authorization boundaries.
- Adopting new state management or persistence patterns.

## File naming
Use zero-padded numbering and a short slug:
- 0001-policy-evaluation-flow.md
- 0002-remediation-state-machine.md

## Workflow
1. Copy 0000-template.md to the next number.
2. Fill all sections.
3. Link related PRs, docs, and migrations.
4. Mark status as Proposed, Accepted, Superseded, or Rejected.

## Status meanings
- Proposed: Under discussion.
- Accepted: Approved and implementation should align.
- Superseded: Replaced by newer ADR.
- Rejected: Considered and intentionally not chosen.
