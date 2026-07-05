# ADR 006 — Execution Graph + Capability Graph as Context OS Kernel

**Status:** accepted  
**Date:** 2026-07-06  
**Deciders:** chief architect  
**Related:** ADR 005 · `docs/RIMVIO_EXECUTION_CAPABILITY_GRAPH.md`

## Context

Travel MVP used **Execution Space** (spatial execution graph) as the primary WHERE contract. That works for map-heavy flows but centers geography. Rimvio targets a **Context OS** that also handles digital commerce, remote care, online meetings, and smart home with the same execution model.

## Decision

1. **Execution Graph** is the long-term center of L2 Blueprint — ordered execution nodes bound to capabilities and executors.
2. **Capability Graph** models required abilities (mobility, lodging, payment, …) and their resource kinds.
3. **Spatial Target** attaches **per capability** (physical · digital · remote · any) — not as the OS root.
4. **Temporal** remains a separate sub-contract; may also attach to capability/execution nodes over time.
5. **Travel MVP** may continue composing `spatialPlan` (Execution Space) without full graph wiring; graphs are optional on Blueprint v4 until L1 dispatch catches up.
6. Blueprint contract bumps to **v4** with optional `executionGraph` and `capabilityGraph`.

## Consequences

### Positive

- One execution model across travel, trade, medical, education, work, smart home.
- Digital contexts need no fake map anchors.
- Clear L3 dispatch: ready execution node + assigned executor + resolved capability spatial (when physical).

### Negative / migration

- `resourcePlan` and capability `resourceKinds` overlap until consolidated.
- Globe map UI may still consume `spatialPlan` as projection layer during MVP.
- L1 `planContextRun` must eventually compose graphs before domain search (backlog).

## Non-goals (this ADR)

- Collapsing L1–L5 layers.
- Auto-commit from graph traversal.
- Replacing Execution Space overnight in production travel flow.
