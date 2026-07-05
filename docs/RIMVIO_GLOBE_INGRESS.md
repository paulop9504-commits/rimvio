# Rimvio Globe Ingress

**Canonical:** single unidirectional compiler path from user intent to OS execution structure.

```
Intent → Context → Bridge → Runtime → Blueprint
```

## One-line definition

`planContextRun` (Globe Ingress branch) = **Intent를 OS 실행 구조(Runtime + Bridge + Blueprint)로 변환하는 Globe ingress compiler**

Globe AI is not a decision system — it **designs execution structure**.

## Layer separation

| Layer | Role |
|-------|------|
| **Globe Ingress** | Creation (planning kernel) — `compileGlobeIngress` |
| **Runtime** | Execution session (OS process) |
| **Reality Surface** | Visualization — Runtime + Bridge + Context projection |
| **Commit** | Reality mutation — gated, separate from compile |

## Pipeline steps

### 1. Intent (input)

Raw user text from composer or capture ingress.

Examples: `일본 여행`, `중고 아이폰 판매`

### 2. Context (meaning unit)

Decompose intent into SSOT meaning slots.

Example slots: destination, frame, region, domain

**Code:** `GlobeIngressContextDraft` — row created at **dispatch Commit boundary** via `ensureTripContextEvent`, not inside the pure compiler.

### 3. Bridge (memory graph)

Relationship structure linking Contexts.

Example path: `집 → 공항 → 오사카 → 호텔`

**Code:** `GlobeIngressBridgeDraft` with `bridgeId` + `pathLabels`

### 4. Runtime (process)

Executable session spawned from Context + Bridge.

**Code:** `composeRuntime()` → `RimvioRuntime`

### 5. Blueprint (execution contract)

Immutable process spec: Flow (execution graph), constraints, required actions, resource plan.

**Code:** `composeTravelTripBlueprint` / `composeTradeBlueprint` / `composeContextBlueprint`

## Capsule

```typescript
compileGlobeIngress({ text, existingContextId? }) => {
  context,
  bridge,
  runtime,
  blueprint,
}
```

## Forbidden re-entry (structural law)

| Forbidden | Meaning |
|-----------|---------|
| `blueprint_to_runtime` | Blueprint must not re-spawn Runtime |
| `bridge_to_intent` | Bridge must not regress to Intent parsing |
| `context_to_runtime_skip` | Context must not skip Bridge to spawn Runtime |

Compiler is **pure** — no domain search, no Places API, no lodging inventory, no Commit.

## Code SSOT

| Artifact | Path |
|----------|------|
| Types | `lib/globe-ingress/types.ts` |
| Compiler | `lib/globe-ingress/compile-globe-ingress.ts` |
| Planner hook | `lib/context-run/plan-context-run.ts` → `globe_ingress` |
| Dispatch | `lib/context-run/dispatch-context-run.ts` |
| Feed sync | `lib/context-run/sync-globe-ingress-to-feed.ts` |

## Eligibility

`isGlobeIngressEligible` — travel trip frame on personal composer.

**Excluded (still `experience_run` or domain paths):**

- Lodging-only search (`lodging_search`)
- Eatery-only search (`eatery_search`)
- Market compose (portal compose path)

## Reality Surface wire

After dispatch, `composeRealitySurfaceFromGlobeIngress()` projects Context + Bridge + Runtime + Flow onto globe chrome (`GlobeRealitySurfaceStrip`). Blueprint stays in session for Operator gate only — never rendered.

Destination advance: `advanceRealitySurfaceDestination()` · map arcs: `projectBridgeMapArcs()` · operator chips: `GlobeOperatorChoiceChips`

See `docs/RIMVIO_REALITY_SURFACE.md` · `hooks/use-reality-surface-projection.ts`

## ADR

See `docs/adr/010-globe-ingress-compiler.md`
