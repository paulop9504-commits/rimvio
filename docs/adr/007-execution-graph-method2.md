# ADR 007 — Execution Graph Method 2 as Canonical Blueprint

**Status:** accepted  
**Date:** 2026-07-06  
**Supersedes:** partial refinement of ADR 006 (Capability Graph as parallel center)  
**Related:** `docs/RIMVIO_EXECUTION_GRAPH.md`

## Context

ADR 006 introduced Execution Graph + Capability Graph as dual L2 sub-contracts. Chief architect recommends **Method 2**: execution nodes are primary; each node carries Spatial Target → Resources → Actions. One graph unifies travel, trade, medical, work.

## Decision

1. **Blueprint v5** shape:
   - Intent (`goal`)
   - `executionGraph`
   - `spatialTargets` (byNodeId)
   - `temporalTargets` (byNodeId)
   - Resources (`resourcePlan`)
   - Executors (`assignedExecutors` + scope + approval)
2. **ExecutionGraphNode** includes `resourceKinds` and `actions` inline; spatial/temporal indexed by node id at blueprint level.
3. Phase-oriented node kinds: `prepare`, `departure`, `stay`, `listing`, `negotiation`, `visit`, `payment`, etc.
4. **Capability Graph** demoted to optional/deprecated migration wire.
5. **Execution Space (`spatialPlan`)** remains travel MVP map projection until derived from `spatialTargets`.

## Consequences

- Single dispatch model across verticals.
- Globe map can project from `spatialTargets` for physical nodes.
- L1 compose examples: `travel-trip-execution-graph.ts`, trade/medical graphs in same file.

## Non-goals

- Rewiring `planContextRun` in this ADR (L1 backlog).
- Removing `spatialPlan` from production travel flow immediately.
