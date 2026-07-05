# ADR-005: Context OS Five-Layer Architecture

**Status:** accepted 2026-07 (amended — Owner Rule · Forbidden Dependencies · State machine)  
**Spec:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md`  
**Wire:** `lib/context-blueprint/types.ts` · `lib/context-blueprint/context-run-state.ts`

## Context

Rimvio must scale across verticals without Globe AI becoming a monolith. Layers were defined but lacked **owners**, **forbidden imports**, and a **runtime state machine** — leading to L4 mutating Blueprint and L3 reinterpreting Intent.

## Decision

Lock five layers with:

1. **Layer Owner Rule** — only the owner may mutate its objects (L1 Intent · L2 Contract · L3 Execution · L4 Reaction · L5 Reality).
2. **Forbidden Dependencies** — L2 pure data; L1 never imports L3; L3 never mutates L2; L4 never creates Blueprint; L5 never creates execution.
3. **State machine** — `intent → blueprint_created → executing → execution_prepared → waiting_approval → committed → observed → reacted`.
4. **Blueprint v3** — sub-contracts inside single L2 SSOT:
   - `spatialPlan` (WHERE — execution space graph)
   - `temporalPlan` (WHEN)
   - `resourcePlan` (WHAT is needed)
   - `personalContext` (WHO — ref at compose time)
5. **Constitution Article 0** — Reality / Intent / Blueprint / Execution invariants.

## Consequences

- PRs must cite owner layer, state transition, and forbidden-dep check.
- `composeContextBlueprint()` remains side-effect free (L1 only).
- Medical/finance verticals default `approvalPolicy: manual | requires_identity`.

## Reject in review

- Cross-layer mutation
- L1 importing `lib/globe/lodging-agent/` or discovery runners
- L4 calling `composeContextBlueprint`
- L5 auto-commit when policy is `manual`
- Blueprint fields mutated in place by L3/L4
