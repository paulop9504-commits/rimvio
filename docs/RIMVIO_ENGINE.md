# Rimvio Engine

**Status:** v0 · L3 Domain Executor packages  
**Wire SSOT:** `lib/engine/`  
**Concept canon:** `docs/RIMVIO_STACK_ALIGNMENT.md`  
**Related:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · `docs/RIMVIO_CONTAINER_AI.md` · [`docs/RIMVIO_TEAM_COLLABORATION.md`](./RIMVIO_TEAM_COLLABORATION.md) (pass / assist)

---

## Definition

> **Engine** is an L3 **execution package** inside a Project (Context Blueprint scope): Goal · State · Policy · Workflow · Tool · Event · Memory · Capability — without mutating Blueprint (L2) or Committing Reality (L5) without human approval.

**SSOT:** `lib/engine/engine-package.ts` · `lib/engine/packages/`

```text
Project (ContextBlueprint)
    ↓
Orchestrator (Globe AI + Operator)     ← not an Engine SKU
    ↓
Engine Package (lodging_search · …)
    ↓
Tool (@ contract · enricher · scout)
    ↓
API / provider
```

### Execution package (8 dimensions)

| Dimension | Type | Role |
|-----------|------|------|
| **Goal** | `RimvioEngineGoal` | Why this engine exists |
| **State** | `readState(event)` → `RimvioEngineRunState` | Engine-owned lifecycle on Context metadata |
| **Policy** | `EnginePolicy` | approval · express slot fill · commit gate |
| **Workflow** | `EngineWorkflowStep[]` | detect → plan → fill_slots → scout → … |
| **Tool** | `EngineToolBinding[]` | operator tools · scout reasons · `@` capabilities |
| **Event** | `EngineEventKindBinding[]` | `scout_complete` · `main_selected` → hub strip |
| **Memory** | `EngineMemorySlot[]` | metadata keys this engine owns / shares |
| **Capability** | `capabilityIds[]` | `@` dispatch contracts inside the package (`BOOK_HOTEL`, …) |

Reference implementation: `lib/engine/packages/lodging-search-package.ts`

Register with `defineRimvioEnginePackage()` — validated at load time.

---

## Engine vs other layers

| Term | Layer | Role |
|------|-------|------|
| **Project** | L2 scope | `ContextBlueprint` + Execution Graph |
| **Orchestrator** | L1 + Operator | Picks which Engine runs this turn |
| **Engine** | L3 | Goal + workflow + state + tool chain |
| **Tool** | L3 internal | `@` contract · scout · prep client |
| **Commit** | L5 | Reality mutation after approval |

**AI is not an Engine.** Orchestrator routes Engines; Domain AI modules live inside Engines.

---

## Shipped engines (v0)

| `RimvioEngineId` | `DomainExecutorId` | Goal | Domain module |
|------------------|-------------------|------|---------------|
| `flight_booking` | `travel` | 항공권 예약 준비 · 출발 허브 | `lib/globe/flight-prep/` |
| `lodging_search` | `lodging` | 숙소 찾기 · 예약 준비 | `lib/globe/lodging-prep/` |
| `local_amenity_search` | `amenity` | 약국·편의점 등 생활 POI | `lib/globe/amenity-prep/` |
| `eatery_search` | `eatery` | 맛집·카페 찾기 | `lib/globe/eatery-prep/` |
| `activity_search` | `activity` | 놀거리·관광 찾기 | `lib/globe/activity-prep/` |
| `trip_experience_search` | `travel` | 재미·맥락 여행 후보 탐색 | `lib/globe/trip-experience/` |
| `transit_navigate` | `transit` | 이동 · 교통 경로 준비 | `lib/globe/transit-prep/` |
| `finance_prep` | `finance` | 결제 · 환전 · 예산 준비 | `lib/globe/finance-prep/` |

---

## Installed engines (Engine Store → Project)

`contextInstalledEnginesV1` on `EventCandidate.metadata`:

```typescript
{
  version: 1,
  engines: [{
    engineId: "lodging_search",
    manifestId: "eng-lodging-search-rimvio-1",
    version: "1.0.0",
    providerId: "rimvio_travel",
    installedAtIso: "…",
    source: "bootstrap" | "marketplace" | "dev",
  }],
}
```

| API | Role |
|-----|------|
| `readContextInstalledEngineIds()` | Installed SKUs for routing |
| `installEngineManifestOnContextMetadata()` | Marketplace → Context wire (pure) |
| `installEngineManifestToContextClient()` | Persist on EventCandidate |
| `bootstrapContextInstalledEnginesClient()` | Persist container defaults |

**Routing:** `planRimvioEngineTurn` / `detectRimvioEnginesForMessage` only consider **installed** engines.

**Blueprint sync:** `deriveEngineIdsFromExecutionGraph()` · `syncInstalledEnginesFromBlueprintMetadata()` — graph nodes/actions → `graph_sync` install records. Marketplace/dev installs preserved. Wired on Globe Ingress + destination advance (`use-reality-surface-projection`).

**Hub UI:** `GlobeContextHubEngineStrip` on Context hub rail — installed **engine** chips + Marketplace install offers (`installEngineManifestToContextClient`).

**Defaults (virtual):** No wire + no blueprint graph → container-kind bootstrap (`travel` = 8 travel engines). Explicit wire → strict list (empty = no engines).

---

## DiscoveryExecution (active surface)

Cursor-like isolation: **one user prompt → one active discovery execution**.

| API | Role |
|-----|------|
| `readActiveDiscoveryExecution` | Active reel / feed / operator SSOT |
| `writeActiveDiscoveryExecution` | Replace active · archive prior |
| `activateDiscoveryExecutionSnapshot` | Restore archived run from chat gate |

Wire: `lib/globe/discovery-execution/` · lastBatch slot = active · archive = superseded runs.

---

## Engine events

`contextEngineEventsV1` on `EventCandidate.metadata`:

- `scout_complete` — scout outcome landed (prompt-frame)
- `main_selected` — MAIN pin / hub connect (commit clients)

Wire: `recordEngineLifecycleClient()` · `readEngineEventsFromMetadata()` · `buildContextHubTimelineRows()` on Hub action strip

**Discovery engines** (`local_amenity_search` · `eatery_search` · `activity_search`):

| Event | When |
|-------|------|
| `scout_complete` | `handlePinned` after scout (`resolveDiscoveryEngineId`) |
| `scout_failed` | empty scout / contract violation in `executeWithSpec` |
| `main_selected` | human pin via `pinContextConditionRecommendation` |

Resolver: `lib/engine/resolve-discovery-engine-id.ts`

Capability invocations: `contextCapabilityInvocationsV1` · `recordContextCapabilityInvocation()` (via `marketplaceDispatch` + `eventId`) · `buildCapabilityInvocationTimelineRows()` — label includes `providerMemberId` (L1: `숙소 예약 · ACME 호텔`)

---

## Execution Graph bindings

`lib/engine/execution-graph-engine-bindings.ts` — nodeId + executorId → `RimvioEngineId`

---

## Marketplace manifests

`lib/marketplace/engine-market-registry.ts` — Engine SKU ↔ `capabilityIds` ↔ `executionNodeIds`

Supply-side identity: `docs/RIMVIO_PROVIDER_NETWORK.md` — `providerMemberId` (SSOT) · `publisherId` (alias)

Public API: `@/lib/marketplace/rimvio-marketplace` → `listPublishedEngineManifests`, `resolveEngineCapabilityIds`, `readProviderMemberId`

---

## Routing

Deterministic priority (lower `priority` wins), **overridden by Execution Plan schedule**:

1. Active plan step (`osPhase: executing` · `running`/`ready`) → `engineId` tried first (`resolveScheduledEngineIdFromEvent`)
2. Soft continue (no other domain detect) → handoff seed for that Engine
3. Else `planRimvioEngineTurn` / `detectRimvioEnginesForMessage` — installed packages by priority
4. Maps Engine plan → `OperatorTurnPlan` (`ask_chips` · `scout`)
5. Wired in `gateOperatorTurnSync()` before generic scout

```bash
npx tsx scripts/test-engine-registry.ts
npx tsx scripts/test-plan-step-sequencer.ts
```

---

## Adding an engine

1. Implement domain one-shot planner under `lib/globe/<domain>/`
2. Add `defineRimvioEnginePackage({ … })` in `lib/engine/packages/<domain>-package.ts`
3. Register in `lib/engine/packages/index.ts`
4. Extend `RIMVIO_ENGINE_IDS` + marketplace manifest + test script

Do **not** bypass Operator fixed tools or Commit gate.

---

## Roadmap (not v0)

- `booking` engine (flight one-shot prep)
- Engine event bus → `EventCandidate` metadata
- Marketplace manifest → `capability-market-registry`
- `DomainExecutorId` full coverage (`transit`, `finance`, …)
