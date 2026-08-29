# ADR-064: Hub Compatibility / Validation Graph

**Status:** Accepted  
**Date:** 2026-08-29  
**Parent:** ADR-058 · ADR-062 · ADR-063 · [RIMVIO_DUAL_EXPERIENCE.md](../RIMVIO_DUAL_EXPERIENCE.md)

## Context

Hub holds **Infrastructure · Capability · Runtime · Adapter** — not only a Capability Registry. Agent discovers **Published Capabilities** only; Infrastructure and Runtime reach the user through **Execution Binding** and **Compatibility validation**.

Dev and Infra providers need to answer:

- “Does Capability B work on Infrastructure A?”
- “Which Capabilities use my PLC infrastructure?”

## Decision

### Layer chain

```text
Rimvio Infrastructure (compute · DB · network · secrets · external service)
        │
     Adapter  (Infrastructure → Rimvio Interface)
        │
   Capability  (Specification — what)
        │
     Runtime   (how — Runtime Router selects from Hub Registry)
        │
  Rimvio Agent  (Capability Discovery only — not Platform Discovery)
```

### Hub stores (1급)

| Store | Agent direct exposure? | Role |
|-------|------------------------|------|
| **Capability** | **Yes** (Published only) | Discovery · contract |
| **Runtime** | No | Router selection · execution environment |
| **Infrastructure** | No | Where external systems live |
| **Adapter** | No | Bridge Infra ↔ Rimvio Interface |

### Compatibility / Validation Graph (1급 concept)

Edges validated at publish and test time:

```text
Infrastructure ↔ Adapter ↔ Capability ↔ Runtime ↔ Rimvio Agent
```

Dev Workspace **Test** UI shows:

```text
hotel.search
  Compatible Infrastructure  ✓ Osaka Hotel API · ✓ Maps
  Compatible Runtime         ✓ Rimvio Browser Runtime
  [ Test ]
```

### Publish semantics

- **Platform** = Dev development/operations unit (code · UI · data · workflow · capabilities).
- **Agent ability** = **Published Capability** from Registry — not the Platform name.
- Platform Publish may bundle owned Capabilities; Registry entries remain per `capabilityId`.

### Payment side-effect boundary

Use explicit capability IDs:

- `payment.prepare` — no charge; Prepare only
- `payment.commit` — financial side effect; **Policy + Permission + Approval + Identity** re-validated at Runtime
- `payment.refund` — reversal path

Do not use ambiguous `payment.process` in contracts or discovery docs.

## Wire (MVP)

| Concern | Path |
|---------|------|
| Capability spec | `lib/rimvio-protocol/capability-specification.ts` |
| Runtime requirements | `lib/platform-sdk/runtime-requirements.ts` |
| Runtime Router | `lib/rimvio-core/runtime-router-select.ts` |
| Registries | `lib/hub/dev/*-registry.ts` |
| Dev compat UI | `hub-dev-compatibility-graph-panel.tsx` · `hub-dev-capability-spec-panel.tsx` |

## PR reject

- Agent discovers Platforms by name
- Hub docs/diagrams that show only Capability Registry (omit Runtime/Infra/Adapter)
- `payment.process` as a published capability without prepare/commit split
- Second Agent runtime package for “AI Builder”
